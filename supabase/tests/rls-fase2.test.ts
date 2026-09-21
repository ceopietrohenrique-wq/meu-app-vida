import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que os dados de saúde (peso, água,
 * medidas, IMC, alimentação, treino) de um usuário nunca são visíveis ou
 * editáveis por outro usuário — a garantia é da policy de RLS no banco,
 * nunca do frontend. Ver docs/business-rules.md > Fase 2.
 */
describe("RLS — Fase 2 (Saúde)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase2-a");
    userB = await createTestUser(admin, "fase2-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("weight_logs: usuário B não vê nem apaga o peso do usuário A", async () => {
    const { data: log, error } = await userA.client
      .from("weight_logs")
      .insert({ weight_kg: 80, date: "2026-02-01" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("weight_logs")
      .select("id")
      .eq("id", log!.id);
    expect(seenByB).toEqual([]);

    const { data: deletedByB } = await userB.client
      .from("weight_logs")
      .delete()
      .eq("id", log!.id)
      .select("id");
    expect(deletedByB).toEqual([]);

    const { data: stillThere } = await admin
      .from("weight_logs")
      .select("id")
      .eq("id", log!.id);
    expect(stillThere).toHaveLength(1);
  });

  it("weight_goals: usuário B não vê nem altera a meta do usuário A", async () => {
    const { data: goal } = await userA.client
      .rpc("set_weight_goal", { p_target_weight_kg: 75, p_target_date: null })
      .single<{ id: string }>();

    const { data: seenByB } = await userB.client
      .from("weight_goals")
      .select("id")
      .eq("id", goal!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB, error: updateError } = await userB.client
      .from("weight_goals")
      .update({ target_weight_kg: 1 })
      .eq("id", goal!.id)
      .select("id");
    expect(updateError).toBeNull();
    expect(updatedByB).toEqual([]);
  });

  it("body_measurements: persiste todos os campos e pode ser recuperado pelo dono; isolado do usuário B", async () => {
    const { error: insertError, data: measurement } = await userA.client
      .from("body_measurements")
      .insert({
        date: "2026-02-01",
        waist_cm: 90.5,
        hip_cm: 100,
        chest_cm: 105,
        arm_cm: 35,
        thigh_cm: 58,
        notes: "medida de teste",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    // Round-trip: o próprio dono consegue ler de volta exatamente o que
    // gravou — prova que a persistência (não só a proteção de RLS) funciona.
    const { data: readBack, error: readError } = await userA.client
      .from("body_measurements")
      .select("*")
      .eq("id", measurement!.id)
      .single();
    expect(readError).toBeNull();
    expect(readBack).toMatchObject({
      date: "2026-02-01",
      waist_cm: 90.5,
      hip_cm: 100,
      chest_cm: 105,
      arm_cm: 35,
      thigh_cm: 58,
      notes: "medida de teste",
    });

    const { data: seenByB } = await userB.client
      .from("body_measurements")
      .select("id")
      .eq("id", measurement!.id);
    expect(seenByB).toEqual([]);
  });

  it("water_logs e water_settings: isolados por usuário", async () => {
    await userA.client.rpc("set_water_goal", { p_daily_goal_ml: 2500 });
    const { data: settingsSeenByB } = await userB.client
      .from("water_settings")
      .select("user_id")
      .eq("user_id", userA.id);
    expect(settingsSeenByB).toEqual([]);

    const { data: log } = await userA.client
      .rpc("log_water", { p_amount_ml: 250, p_date: "2026-02-01" })
      .single<{ water_log_row: { id: string } }>();

    const { data: logSeenByB } = await userB.client
      .from("water_logs")
      .select("id")
      .eq("id", log!.water_log_row.id);
    expect(logSeenByB).toEqual([]);
  });

  it("meal_plans e meal_logs: usuário B não acessa nem gera XP nos dados do usuário A", async () => {
    const { data: plan } = await userA.client
      .from("meal_plans")
      .insert({ name: "Café da manhã (RLS test)" })
      .select("id")
      .single();

    const { error: rpcErrorForB } = await userB.client.rpc(
      "set_meal_log_status",
      {
        p_meal_plan_id: plan!.id,
        p_date: "2026-02-01",
        p_status: "realizada",
      },
    );
    // A RPC busca o plano filtrando por user_id = auth.uid(): para o
    // usuário B, o plano do usuário A "não existe" (P0002).
    expect(rpcErrorForB).not.toBeNull();

    const { data: planSeenByB } = await userB.client
      .from("meal_plans")
      .select("id")
      .eq("id", plan!.id);
    expect(planSeenByB).toEqual([]);
  });

  it("workout_plans/exercises/sessions/sets: usuário B não acessa os dados do usuário A", async () => {
    const { data: plan } = await userA.client
      .from("workout_plans")
      .insert({ name: "Treino RLS test" })
      .select("id")
      .single();
    const { data: exercise } = await userA.client
      .from("workout_exercises")
      .insert({ workout_plan_id: plan!.id, name: "Supino" })
      .select("id")
      .single();

    const { error: startErrorForB } = await userB.client.rpc(
      "start_workout_session",
      {
        p_workout_plan_id: plan!.id,
        p_date: "2026-02-01",
      },
    );
    expect(startErrorForB).not.toBeNull();

    const { data: session } = await userA.client
      .rpc("start_workout_session", {
        p_workout_plan_id: plan!.id,
        p_date: "2026-02-01",
      })
      .single<{ id: string }>();

    const { error: setErrorForB } = await userB.client.rpc("log_exercise_set", {
      p_workout_session_id: session!.id,
      p_workout_exercise_id: exercise!.id,
      p_set_order: 1,
      p_load_kg: 80,
      p_reps: 10,
    });
    expect(setErrorForB).not.toBeNull();

    const { error: completeErrorForB } = await userB.client.rpc(
      "complete_workout_session",
      { p_workout_session_id: session!.id },
    );
    expect(completeErrorForB).not.toBeNull();

    const { data: sessionsSeenByB } = await userB.client
      .from("workout_sessions")
      .select("id")
      .eq("id", session!.id);
    expect(sessionsSeenByB).toEqual([]);
  });

  it("walk_logs: isolado por usuário", async () => {
    const { data: walk } = await userA.client
      .rpc("log_walk", {
        p_date: "2026-02-01",
        p_duration_minutes: 30,
        p_distance_km: null,
      })
      .single<{ walk_log_row: { id: string } }>();

    const { data: seenByB } = await userB.client
      .from("walk_logs")
      .select("id")
      .eq("id", walk!.walk_log_row.id);
    expect(seenByB).toEqual([]);
  });
});
