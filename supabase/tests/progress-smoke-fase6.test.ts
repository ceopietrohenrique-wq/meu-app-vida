import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Smoke test das RPCs novas da Fase 6 contra o banco real, antes de
 * construir a camada de aplicação por cima.
 */
describe("Fase 6 — smoke RPCs de Progresso", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "progress-smoke");
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("get_progress_summary retorna zeros sem erro quando não há dados", async () => {
    const { data, error } = await user.client
      .rpc("get_progress_summary", {
        p_period_start: "2026-01-01",
        p_period_end: "2026-01-31",
      })
      .single<{ xp_total: number; tasks_completed: number }>();

    expect(error).toBeNull();
    expect(data?.xp_total).toBe(0);
    expect(data?.tasks_completed).toBe(0);
  });

  it("get_xp_trend retorna array vazio sem erro", async () => {
    const { data, error } = await user.client.rpc("get_xp_trend", {
      p_period_start: "2026-01-01",
      p_period_end: "2026-01-31",
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("goals: cria meta trimestral e marca como concluída", async () => {
    const { data: goal, error } = await user.client
      .from("goals")
      .insert({
        title: "Validar meu negócio",
        type: "trimestral",
        kind: "resultado",
        period_start: "2026-01-01",
        period_end: "2026-03-31",
      })
      .select("*")
      .single();

    expect(error).toBeNull();
    expect(goal?.is_completed).toBe(false);

    const { data: updated } = await user.client
      .from("goals")
      .update({ is_completed: true })
      .eq("id", goal!.id)
      .select("is_completed")
      .single();
    expect(updated?.is_completed).toBe(true);
  });

  it("check_and_unlock_achievements desbloqueia a meta trimestral concluída", async () => {
    const { data, error } = await user.client.rpc(
      "check_and_unlock_achievements",
    );
    expect(error).toBeNull();
    const keys = (data as { achievement_key: string }[]).map(
      (a) => a.achievement_key,
    );
    expect(keys).toContain("meta_trimestral_concluida");

    // Idempotente: chamar de novo não retorna a mesma conquista de novo.
    const second = await user.client.rpc("check_and_unlock_achievements");
    const secondKeys = (second.data as { achievement_key: string }[]).map(
      (a) => a.achievement_key,
    );
    expect(secondKeys).not.toContain("meta_trimestral_concluida");
  });

  it("rewards: sem XP suficiente o resgate é bloqueado no servidor", async () => {
    const { data: reward } = await user.client
      .from("rewards")
      .insert({ name: "Assistir um filme", xp_cost: 500 })
      .select("id")
      .single();

    const { error } = await user.client.rpc("redeem_reward", {
      p_reward_id: reward!.id,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/insuficiente/i);
  });

  it("rewards: com XP suficiente, resgatar registra o total acumulado e o custo gasto no momento", async () => {
    const { data: reward } = await user.client
      .from("rewards")
      .insert({ name: "Comprar algo pequeno", xp_cost: 500 })
      .select("id")
      .single();

    await user.client.from("xp_events").insert({
      event_type: "test_grant",
      entity_type: "test",
      entity_id: crypto.randomUUID(),
      xp_amount: 500,
      source_key: "TEST:progress-smoke-reward-grant",
    });

    const { data: redemption, error } = await user.client
      .rpc("redeem_reward", { p_reward_id: reward!.id })
      .single<{
        xp_total_at_redemption: number;
        xp_cost_at_redemption: number;
      }>();

    expect(error).toBeNull();
    expect(redemption?.xp_total_at_redemption).toBe(500);
    expect(redemption?.xp_cost_at_redemption).toBe(500);
  });

  it("weekly_reviews: snapshot calcula zeros e salvar upsert funciona", async () => {
    const snapshot = await user.client
      .rpc("get_weekly_review_snapshot", { p_week_start: "2026-01-05" })
      .single<{ xp_earned: number; tasks_completed: number }>();
    expect(snapshot.error).toBeNull();
    expect(snapshot.data?.xp_earned).toBe(0);

    const { data: review, error } = await user.client
      .from("weekly_reviews")
      .upsert(
        { week_start: "2026-01-05", what_worked: "Consistência" },
        { onConflict: "user_id,week_start" },
      )
      .select("*")
      .single();
    expect(error).toBeNull();
    expect(review?.what_worked).toBe("Consistência");
  });
});
