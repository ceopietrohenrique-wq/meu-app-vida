import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que o XP de saúde (peso, água, adesão
 * alimentar, treino, caminhada) nunca é concedido duas vezes para o mesmo
 * evento — mesma garantia da Fase 1 (constraint UNIQUE em xp_events), agora
 * para as granularidades novas (semanal, diária, por sessão). Ver
 * docs/business-rules.md > 7.
 */
describe("XP de Saúde — idempotente", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "xp-fase2");
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  async function xpEventCount(sourceKey: string) {
    const { data, error } = await admin
      .from("xp_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_key", sourceKey);
    expect(error).toBeNull();
    return data?.length ?? 0;
  }

  it("peso: múltiplos registros na mesma semana ISO concedem XP uma única vez", async () => {
    const sourceKey = "WEIGHT_LOGGED:2026-W05";

    const first = await user.client
      .rpc("log_weight", {
        p_weight_kg: 80,
        p_date: "2026-01-26",
        p_notes: null,
      })
      .single<{ xp_awarded: boolean }>();
    expect(first.data?.xp_awarded).toBe(true);
    expect(await xpEventCount(sourceKey)).toBe(1);

    // Mesma semana ISO (2026-W05), dia diferente — não concede XP de novo.
    const second = await user.client
      .rpc("log_weight", {
        p_weight_kg: 79.8,
        p_date: "2026-01-28",
        p_notes: null,
      })
      .single<{ xp_awarded: boolean }>();
    expect(second.data?.xp_awarded).toBe(false);
    expect(await xpEventCount(sourceKey)).toBe(1);

    // Os dois registros de peso continuam existindo — nunca sobrescritos.
    const { data: logs } = await admin
      .from("weight_logs")
      .select("id")
      .eq("user_id", user.id)
      .in("date", ["2026-01-26", "2026-01-28"]);
    expect(logs).toHaveLength(2);
  });

  it("água: XP concedido uma única vez no dia em que a meta é atingida", async () => {
    const date = "2026-01-20";
    const sourceKey = `WATER_GOAL:${date}`;

    await user.client.rpc("set_water_goal", { p_daily_goal_ml: 1000 });

    const first = await user.client
      .rpc("log_water", { p_amount_ml: 700, p_date: date })
      .single<{ goal_reached: boolean; xp_awarded: boolean }>();
    expect(first.data?.goal_reached).toBe(false);
    expect(first.data?.xp_awarded).toBe(false);
    expect(await xpEventCount(sourceKey)).toBe(0);

    const second = await user.client
      .rpc("log_water", { p_amount_ml: 400, p_date: date })
      .single<{ goal_reached: boolean; xp_awarded: boolean }>();
    expect(second.data?.goal_reached).toBe(true);
    expect(second.data?.xp_awarded).toBe(true);
    expect(await xpEventCount(sourceKey)).toBe(1);

    const third = await user.client
      .rpc("log_water", { p_amount_ml: 100, p_date: date })
      .single<{ xp_awarded: boolean }>();
    expect(third.data?.xp_awarded).toBe(false);
    expect(await xpEventCount(sourceKey)).toBe(1);
  });

  it("alimentação: marcar 'realizada' repetidamente não duplica XP; mudar para 'parcial' não revoga", async () => {
    const { data: plan } = await user.client
      .from("meal_plans")
      .insert({ name: "Almoço (xp test)" })
      .select("id")
      .single();

    const date = "2026-01-21";
    const sourceKey = `MEAL_PLAN_ADHERENCE:${plan!.id}:${date}`;

    const first = await user.client
      .rpc("set_meal_log_status", {
        p_meal_plan_id: plan!.id,
        p_date: date,
        p_status: "realizada",
      })
      .single<{ xp_awarded: boolean }>();
    expect(first.data?.xp_awarded).toBe(true);
    expect(await xpEventCount(sourceKey)).toBe(1);

    const second = await user.client
      .rpc("set_meal_log_status", {
        p_meal_plan_id: plan!.id,
        p_date: date,
        p_status: "realizada",
      })
      .single<{ xp_awarded: boolean }>();
    expect(second.data?.xp_awarded).toBe(false);
    expect(await xpEventCount(sourceKey)).toBe(1);

    await user.client.rpc("set_meal_log_status", {
      p_meal_plan_id: plan!.id,
      p_date: date,
      p_status: "parcial",
    });
    // XP já concedido não é revogado ao mudar de status.
    expect(await xpEventCount(sourceKey)).toBe(1);
  });

  it("treino: concluir a mesma sessão duas vezes não duplica XP", async () => {
    const { data: plan } = await user.client
      .from("workout_plans")
      .insert({ name: "Treino XP test" })
      .select("id")
      .single();
    const { data: session } = await user.client
      .rpc("start_workout_session", {
        p_workout_plan_id: plan!.id,
        p_date: "2026-01-22",
      })
      .single<{ id: string }>();

    const sourceKey = `WORKOUT_COMPLETED:${session!.id}`;

    const [first, second] = await Promise.all([
      user.client
        .rpc("complete_workout_session", { p_workout_session_id: session!.id })
        .single<{ xp_awarded: boolean }>(),
      user.client
        .rpc("complete_workout_session", { p_workout_session_id: session!.id })
        .single<{ xp_awarded: boolean }>(),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const awardedCount = [
      first.data?.xp_awarded,
      second.data?.xp_awarded,
    ].filter(Boolean).length;
    expect(awardedCount).toBe(1);
    expect(await xpEventCount(sourceKey)).toBe(1);
  });

  it("caminhada: no máximo um XP por dia mesmo com múltiplos registros", async () => {
    const date = "2026-01-23";
    const sourceKey = `WALK_LOGGED:${date}`;

    const first = await user.client
      .rpc("log_walk", {
        p_date: date,
        p_duration_minutes: 20,
        p_distance_km: null,
      })
      .single<{ xp_awarded: boolean }>();
    expect(first.data?.xp_awarded).toBe(true);

    const second = await user.client
      .rpc("log_walk", {
        p_date: date,
        p_duration_minutes: 15,
        p_distance_km: null,
      })
      .single<{ xp_awarded: boolean }>();
    expect(second.data?.xp_awarded).toBe(false);
    expect(await xpEventCount(sourceKey)).toBe(1);

    const { data: walks } = await admin
      .from("walk_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", date);
    expect(walks).toHaveLength(2);
  });
});
