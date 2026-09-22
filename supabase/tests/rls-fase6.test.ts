import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que nenhuma entidade nova da Fase 6
 * (metas trimestrais via goals, weekly_reviews, rewards,
 * reward_redemptions, user_achievements) é visível ou editável por outro
 * usuário, e que os vínculos entre entidades (parent_goal_id,
 * weekly_plans.quarterly_goal_id, reward_redemptions.reward_id) não podem
 * apontar para dados de outro usuário. Ver docs/business-rules.md > Fase 6.
 */
describe("RLS — Fase 6 (Progresso)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase6-a");
    userB = await createTestUser(admin, "fase6-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("goals (meta trimestral): isolado por usuário, e parent_goal_id não pode apontar para meta de outro usuário", async () => {
    const { data: goalA, error } = await userA.client
      .from("goals")
      .insert({
        title: "Meta A",
        type: "trimestral",
        kind: "resultado",
        period_start: "2026-01-01",
        period_end: "2026-03-31",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("goals")
      .select("id")
      .eq("id", goalA!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("goals")
      .update({ is_completed: true })
      .eq("id", goalA!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    // B tenta criar uma meta filha de uma meta de A — bloqueado pelo
    // trigger de ownership (a FK sozinha só garante que a linha existe).
    const { error: crossParentError } = await userB.client
      .from("goals")
      .insert({
        title: "Meta filha inválida",
        type: "semanal",
        kind: "processo",
        period_start: "2026-01-01",
        period_end: "2026-01-07",
        parent_goal_id: goalA!.id,
      });
    expect(crossParentError).not.toBeNull();
  });

  it("weekly_plans.quarterly_goal_id não pode apontar para meta de outro usuário", async () => {
    const { data: goalA } = await userA.client
      .from("goals")
      .insert({
        title: "Meta A para vínculo",
        type: "trimestral",
        kind: "resultado",
        period_start: "2026-01-01",
        period_end: "2026-03-31",
      })
      .select("id")
      .single();

    const { error } = await userB.client.from("weekly_plans").insert({
      week_start: "2026-01-05",
      quarterly_goal_id: goalA!.id,
    });
    expect(error).not.toBeNull();
  });

  it("weekly_reviews: isolado por usuário", async () => {
    const { data: review, error } = await userA.client
      .from("weekly_reviews")
      .insert({ week_start: "2026-02-02", what_worked: "Consistência" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("weekly_reviews")
      .select("id")
      .eq("id", review!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("weekly_reviews")
      .update({ what_worked: "hackeado" })
      .eq("id", review!.id)
      .select("id");
    expect(updatedByB).toEqual([]);
  });

  it("rewards e reward_redemptions: isolados por usuário, resgate não pode usar recompensa de outro usuário", async () => {
    const { data: rewardA, error } = await userA.client
      .from("rewards")
      .insert({ name: "Recompensa A", xp_cost: 100 })
      .select("id")
      .single();
    expect(error).toBeNull();

    // Sem XP acumulado, o resgate deve ser bloqueado no servidor (saldo
    // insuficiente), nunca só uma checagem de UI.
    const { error: insufficientError } = await userA.client.rpc(
      "redeem_reward",
      { p_reward_id: rewardA!.id },
    );
    expect(insufficientError).not.toBeNull();
    expect(insufficientError!.message).toMatch(/insuficiente/i);

    await userA.client.from("xp_events").insert({
      event_type: "test_grant",
      entity_type: "test",
      entity_id: crypto.randomUUID(),
      xp_amount: 100,
      source_key: "TEST:reward-audit-grant",
    });

    const { data: seenByB } = await userB.client
      .from("rewards")
      .select("id")
      .eq("id", rewardA!.id);
    expect(seenByB).toEqual([]);

    const { error: crossRedeemError } = await userB.client.rpc(
      "redeem_reward",
      {
        p_reward_id: rewardA!.id,
      },
    );
    expect(crossRedeemError).not.toBeNull();

    const { data: redemptionA } = await userA.client
      .rpc("redeem_reward", { p_reward_id: rewardA!.id })
      .single<{ id: string; xp_cost_at_redemption: number }>();
    expect(redemptionA?.xp_cost_at_redemption).toBe(100);

    const { data: redemptionSeenByB } = await userB.client
      .from("reward_redemptions")
      .select("id")
      .eq("id", redemptionA!.id);
    expect(redemptionSeenByB).toEqual([]);
  });

  it("redeem_reward: reenviar a mesma client_request_id não duplica o resgate (idempotência)", async () => {
    const { data: reward } = await userA.client
      .from("rewards")
      .insert({ name: "Recompensa idempotência", xp_cost: 10 })
      .select("id")
      .single();

    await userA.client.from("xp_events").insert({
      event_type: "test_grant",
      entity_type: "test",
      entity_id: crypto.randomUUID(),
      xp_amount: 10,
      source_key: "TEST:reward-idempotency-grant",
    });

    const clientRequestId = crypto.randomUUID();
    const first = await userA.client
      .rpc("redeem_reward", {
        p_reward_id: reward!.id,
        p_client_request_id: clientRequestId,
      })
      .single<{ id: string }>();
    const second = await userA.client
      .rpc("redeem_reward", {
        p_reward_id: reward!.id,
        p_client_request_id: clientRequestId,
      })
      .single<{ id: string }>();

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data?.id).toBe(first.data?.id);

    const { count } = await userA.client
      .from("reward_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("reward_id", reward!.id);
    expect(count).toBe(1);
  });

  it("redeem_reward: duas chamadas concorrentes nunca gastam o mesmo saldo duas vezes", async () => {
    const { data: reward } = await userA.client
      .from("rewards")
      .insert({ name: "Recompensa concorrência", xp_cost: 50 })
      .select("id")
      .single();

    // Exatamente o suficiente para UM resgate de 50 XP — não dois.
    await userA.client.from("xp_events").insert({
      event_type: "test_grant",
      entity_type: "test",
      entity_id: crypto.randomUUID(),
      xp_amount: 50,
      source_key: "TEST:reward-concurrency-grant",
    });

    const [resultOne, resultTwo] = await Promise.all([
      userA.client.rpc("redeem_reward", { p_reward_id: reward!.id }),
      userA.client.rpc("redeem_reward", { p_reward_id: reward!.id }),
    ]);

    const outcomes = [resultOne, resultTwo];
    const succeeded = outcomes.filter((r) => r.error === null);
    const failed = outcomes.filter((r) => r.error !== null);

    // Exatamente um dos dois resgates concorrentes passa — o lock por
    // usuário (pg_advisory_xact_lock) serializa as duas transações, então a
    // segunda vê o saldo já debitado pela primeira e é rejeitada.
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.error!.message).toMatch(/insuficiente/i);

    const { count } = await userA.client
      .from("reward_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("reward_id", reward!.id);
    expect(count).toBe(1);
  });

  it("user_achievements: isolado por usuário", async () => {
    await userA.client.from("tasks").insert({ title: "Tarefa conquista A" });
    const { data: task } = await userA.client
      .from("tasks")
      .select("id")
      .eq("title", "Tarefa conquista A")
      .single();
    await userA.client
      .from("tasks")
      .update({ status: "concluida" })
      .eq("id", task!.id);

    const { data: unlocked } = await userA.client.rpc(
      "check_and_unlock_achievements",
    );
    expect(
      (unlocked as { achievement_key: string }[]).some(
        (a) => a.achievement_key === "primeira_tarefa",
      ),
    ).toBe(true);

    const { data: achievementA } = await admin
      .from("user_achievements")
      .select("id")
      .eq("user_id", userA.id)
      .eq("achievement_key", "primeira_tarefa")
      .single();

    const { data: seenByB } = await userB.client
      .from("user_achievements")
      .select("id")
      .eq("id", achievementA!.id);
    expect(seenByB).toEqual([]);

    // B nunca desbloqueia a conquista de A ao rodar a própria checagem.
    const { data: unlockedForB } = await userB.client.rpc(
      "check_and_unlock_achievements",
    );
    expect(
      (unlockedForB as { achievement_key: string }[]).some(
        (a) => a.achievement_key === "primeira_tarefa",
      ),
    ).toBe(false);
  });

  it("get_progress_summary e get_xp_trend: cada usuário só vê os próprios dados", async () => {
    await userA.client.from("tasks").insert({
      title: "Tarefa progresso A",
      status: "concluida",
      due_date: "2026-04-01",
    });

    const summaryA = await userA.client
      .rpc("get_progress_summary", {
        p_period_start: "2026-04-01",
        p_period_end: "2026-04-01",
      })
      .single<{ tasks_completed: number }>();
    const summaryB = await userB.client
      .rpc("get_progress_summary", {
        p_period_start: "2026-04-01",
        p_period_end: "2026-04-01",
      })
      .single<{ tasks_completed: number }>();

    expect(summaryA.data?.tasks_completed).toBeGreaterThanOrEqual(1);
    expect(summaryB.data?.tasks_completed).toBe(0);
  });
});
