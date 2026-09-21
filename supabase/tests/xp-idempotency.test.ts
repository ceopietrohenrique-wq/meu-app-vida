import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

type CompleteResult = {
  xp_awarded: boolean;
  xp_amount: number;
};

/**
 * Prova, contra um Supabase real, a regra crítica do produto: XP nunca é
 * concedido duas vezes para o mesmo evento — a garantia é do banco
 * (constraint UNIQUE em xp_events + RPCs), nunca do frontend.
 * Ver docs/business-rules.md > 1.
 */
describe("XP idempotente", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "xp");
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

  describe("tarefas", () => {
    it("concluir uma tarefa concede XP uma única vez", async () => {
      const { data: task, error: taskError } = await user.client
        .from("tasks")
        .insert({ title: "Tarefa XP única", xp_reward: 10 })
        .select("id")
        .single();
      expect(taskError).toBeNull();

      const sourceKey = `TASK_COMPLETED:${task!.id}`;
      expect(await xpEventCount(sourceKey)).toBe(0);

      const { data: result, error } = await user.client
        .rpc("complete_task", { p_task_id: task!.id })
        .single<CompleteResult>();

      expect(error).toBeNull();
      expect(result?.xp_awarded).toBe(true);
      expect(result?.xp_amount).toBe(10);
      expect(await xpEventCount(sourceKey)).toBe(1);
    });

    it("desmarcar e marcar novamente não duplica XP", async () => {
      const { data: task } = await user.client
        .from("tasks")
        .insert({ title: "Tarefa toggle", xp_reward: 15 })
        .select("id")
        .single();

      const sourceKey = `TASK_COMPLETED:${task!.id}`;

      await user.client.rpc("complete_task", { p_task_id: task!.id }).single();
      expect(await xpEventCount(sourceKey)).toBe(1);

      const { error: uncompleteError } = await user.client
        .rpc("uncomplete_task", { p_task_id: task!.id })
        .single();
      expect(uncompleteError).toBeNull();

      // Desmarcar não revoga o XP já concedido (histórico imutável).
      expect(await xpEventCount(sourceKey)).toBe(1);

      const { data: secondComplete } = await user.client
        .rpc("complete_task", { p_task_id: task!.id })
        .single<CompleteResult>();

      expect(secondComplete?.xp_awarded).toBe(false);
      expect(await xpEventCount(sourceKey)).toBe(1);
    });

    it("repetir a mesma requisição (double-submit) não duplica XP", async () => {
      const { data: task } = await user.client
        .from("tasks")
        .insert({ title: "Tarefa double-submit", xp_reward: 20 })
        .select("id")
        .single();

      const sourceKey = `TASK_COMPLETED:${task!.id}`;

      const [first, second] = await Promise.all([
        user.client
          .rpc("complete_task", { p_task_id: task!.id })
          .single<CompleteResult>(),
        user.client
          .rpc("complete_task", { p_task_id: task!.id })
          .single<CompleteResult>(),
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

    it("a proteção é do banco: inserir o mesmo source_key manualmente também falha", async () => {
      const { data: task } = await user.client
        .from("tasks")
        .insert({ title: "Tarefa insert direto", xp_reward: 5 })
        .select("id")
        .single();

      const sourceKey = `TASK_COMPLETED:${task!.id}`;

      const { error: firstInsert } = await user.client
        .from("xp_events")
        .insert({
          user_id: user.id,
          event_type: "TASK_COMPLETED",
          entity_type: "task",
          entity_id: task!.id,
          xp_amount: 5,
          source_key: sourceKey,
        });
      expect(firstInsert).toBeNull();

      const { error: secondInsert } = await user.client
        .from("xp_events")
        .insert({
          user_id: user.id,
          event_type: "TASK_COMPLETED",
          entity_type: "task",
          entity_id: task!.id,
          xp_amount: 5,
          source_key: sourceKey,
        });

      // A constraint UNIQUE(user_id, source_key) rejeita a duplicata mesmo
      // sem passar pela RPC — a garantia não depende de nenhuma lógica de
      // aplicação, só do schema do banco.
      expect(secondInsert).not.toBeNull();
      expect(await xpEventCount(sourceKey)).toBe(1);
    });
  });

  describe("hábitos", () => {
    it("concluir um hábito no mesmo dia concede XP uma única vez, mesmo desmarcando e remarcando", async () => {
      const { data: habit } = await user.client
        .from("habits")
        .insert({ name: "Beber água", frequency: "diaria", xp_reward: 10 })
        .select("id")
        .single();

      const date = "2026-01-15";
      const sourceKey = `HABIT:${habit!.id}:${date}`;

      const { data: firstComplete } = await user.client
        .rpc("complete_habit", { p_habit_id: habit!.id, p_date: date })
        .single<CompleteResult>();
      expect(firstComplete?.xp_awarded).toBe(true);
      expect(await xpEventCount(sourceKey)).toBe(1);

      const { error: uncompleteError } = await user.client.rpc(
        "uncomplete_habit",
        { p_habit_id: habit!.id, p_date: date },
      );
      expect(uncompleteError).toBeNull();
      expect(await xpEventCount(sourceKey)).toBe(1);

      const { data: secondComplete } = await user.client
        .rpc("complete_habit", { p_habit_id: habit!.id, p_date: date })
        .single<CompleteResult>();
      expect(secondComplete?.xp_awarded).toBe(false);
      expect(await xpEventCount(sourceKey)).toBe(1);
    });

    it("repetir a mesma requisição de hábito (double-submit) não duplica XP", async () => {
      const { data: habit } = await user.client
        .from("habits")
        .insert({ name: "Devocional", frequency: "diaria", xp_reward: 10 })
        .select("id")
        .single();

      const date = "2026-01-16";
      const sourceKey = `HABIT:${habit!.id}:${date}`;

      const [first, second] = await Promise.all([
        user.client
          .rpc("complete_habit", { p_habit_id: habit!.id, p_date: date })
          .single(),
        user.client
          .rpc("complete_habit", { p_habit_id: habit!.id, p_date: date })
          .single(),
      ]);

      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
      expect(await xpEventCount(sourceKey)).toBe(1);
    });
  });
});
