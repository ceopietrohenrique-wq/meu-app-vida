import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Isolamento entre usuários nas entidades críticas da Fase 1: tasks,
 * habits/habit_logs e notifications. Mesmo padrão de supabase/tests/rls.test.ts
 * (Fase 0): usuário A não lê, edita nem exclui dado do usuário B.
 */
describe("RLS: entidades da Fase 1", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase1-a");
    userB = await createTestUser(admin, "fase1-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  describe("tasks", () => {
    let taskOfA: { id: string };

    beforeAll(async () => {
      const { data, error } = await userA.client
        .from("tasks")
        .insert({ title: "Tarefa privada de A" })
        .select("id")
        .single();
      if (error || !data) throw new Error(`fixture: ${error?.message}`);
      taskOfA = data;
    });

    it("usuário B não lê a tarefa de A", async () => {
      const { data, error } = await userB.client
        .from("tasks")
        .select("*")
        .eq("id", taskOfA.id)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("usuário B não edita a tarefa de A", async () => {
      const { data } = await userB.client
        .from("tasks")
        .update({ title: "Hackeado" })
        .eq("id", taskOfA.id)
        .select("*");
      expect(data).toEqual([]);
    });

    it("usuário B não exclui a tarefa de A", async () => {
      const { data } = await userB.client
        .from("tasks")
        .delete()
        .eq("id", taskOfA.id)
        .select("*");
      expect(data).toEqual([]);

      const { data: stillExists } = await admin
        .from("tasks")
        .select("id")
        .eq("id", taskOfA.id)
        .maybeSingle();
      expect(stillExists?.id).toBe(taskOfA.id);
    });

    it("usuário B não conclui a tarefa de A via RPC", async () => {
      const { data, error } = await userB.client
        .rpc("complete_task", { p_task_id: taskOfA.id })
        .single();
      // A função não encontra a tarefa (RLS filtra), então levanta exceção —
      // nunca conclui silenciosamente uma tarefa de outro usuário.
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe("habits e habit_logs", () => {
    let habitOfA: { id: string };

    beforeAll(async () => {
      const { data, error } = await userA.client
        .from("habits")
        .insert({ name: "Hábito privado de A", frequency: "diaria" })
        .select("id")
        .single();
      if (error || !data) throw new Error(`fixture: ${error?.message}`);
      habitOfA = data;

      const { error: logError } = await userA.client
        .from("habit_logs")
        .insert({ habit_id: habitOfA.id, date: "2026-01-10" });
      if (logError) throw new Error(`fixture log: ${logError.message}`);
    });

    it("usuário B não lê o hábito nem os logs de A", async () => {
      const { data: habitData } = await userB.client
        .from("habits")
        .select("*")
        .eq("id", habitOfA.id)
        .maybeSingle();
      expect(habitData).toBeNull();

      const { data: logsData } = await userB.client
        .from("habit_logs")
        .select("*")
        .eq("habit_id", habitOfA.id);
      expect(logsData).toEqual([]);
    });

    it("usuário B não consegue marcar o hábito de A via RPC", async () => {
      const { error } = await userB.client
        .rpc("complete_habit", {
          p_habit_id: habitOfA.id,
          p_date: "2026-01-11",
        })
        .single();
      expect(error).not.toBeNull();
    });

    it("usuário B não exclui o log de A diretamente", async () => {
      const { data } = await userB.client
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitOfA.id)
        .select("*");
      expect(data).toEqual([]);

      const { data: stillExists } = await admin
        .from("habit_logs")
        .select("id")
        .eq("habit_id", habitOfA.id)
        .maybeSingle();
      expect(stillExists).not.toBeNull();
    });
  });

  describe("imutabilidade de históricos (xp_events e habit_logs)", () => {
    let xpEventOfA: { id: string; source_key: string };
    let habitOfA: { id: string };
    let logOfA: { id: string };

    beforeAll(async () => {
      const { data: task, error: taskError } = await userA.client
        .from("tasks")
        .insert({ title: "Tarefa para XP imutável", xp_reward: 10 })
        .select("id")
        .single();
      if (taskError || !task) throw new Error(`fixture: ${taskError?.message}`);

      const { error: completeError } = await userA.client
        .rpc("complete_task", { p_task_id: task.id })
        .single();
      if (completeError) throw new Error(`fixture: ${completeError.message}`);

      const sourceKey = `TASK_COMPLETED:${task.id}`;
      const { data: xpEvent, error: xpError } = await admin
        .from("xp_events")
        .select("id, source_key")
        .eq("user_id", userA.id)
        .eq("source_key", sourceKey)
        .single();
      if (xpError || !xpEvent) throw new Error(`fixture: ${xpError?.message}`);
      xpEventOfA = xpEvent;

      const { data: habit, error: habitError } = await userA.client
        .from("habits")
        .insert({ name: "Hábito para log imutável", frequency: "diaria" })
        .select("id")
        .single();
      if (habitError || !habit)
        throw new Error(`fixture: ${habitError?.message}`);
      habitOfA = habit;

      const { data: log, error: logError } = await userA.client
        .from("habit_logs")
        .insert({ habit_id: habitOfA.id, date: "2026-01-20" })
        .select("id")
        .single();
      if (logError || !log) throw new Error(`fixture: ${logError?.message}`);
      logOfA = log;
    });

    it("o próprio dono não consegue atualizar um xp_event já concedido", async () => {
      const { data } = await userA.client
        .from("xp_events")
        .update({ xp_amount: 999 })
        .eq("id", xpEventOfA.id)
        .select("*");
      // Sem policy de UPDATE em xp_events: nem o dono altera. A tabela é
      // imutável por design, não só protegida entre usuários.
      expect(data).toEqual([]);

      const { data: unchanged } = await admin
        .from("xp_events")
        .select("xp_amount")
        .eq("id", xpEventOfA.id)
        .single();
      expect(unchanged?.xp_amount).not.toBe(999);
    });

    it("o próprio dono não consegue excluir um xp_event já concedido", async () => {
      const { data } = await userA.client
        .from("xp_events")
        .delete()
        .eq("id", xpEventOfA.id)
        .select("*");
      expect(data).toEqual([]);

      const { data: stillExists } = await admin
        .from("xp_events")
        .select("id")
        .eq("id", xpEventOfA.id)
        .maybeSingle();
      expect(stillExists?.id).toBe(xpEventOfA.id);
    });

    it("usuário B não consegue atualizar nem excluir o xp_event de A", async () => {
      const { data: updateData } = await userB.client
        .from("xp_events")
        .update({ xp_amount: 999 })
        .eq("id", xpEventOfA.id)
        .select("*");
      expect(updateData).toEqual([]);

      const { data: deleteData } = await userB.client
        .from("xp_events")
        .delete()
        .eq("id", xpEventOfA.id)
        .select("*");
      expect(deleteData).toEqual([]);
    });

    it("o próprio dono não consegue atualizar um habit_log diretamente (substituição é via delete + insert)", async () => {
      const { data } = await userA.client
        .from("habit_logs")
        .update({ value: 999 })
        .eq("id", logOfA.id)
        .select("*");
      // Sem policy de UPDATE em habit_logs: o registro é substituído por
      // delete + insert, nunca editado in-place, nem pelo próprio dono.
      expect(data).toEqual([]);
    });

    it("o próprio dono consegue excluir (não atualizar) seu próprio habit_log", async () => {
      const { data, error } = await userA.client
        .from("habit_logs")
        .delete()
        .eq("id", logOfA.id)
        .select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("notifications", () => {
    let notificationOfA: { id: string };

    beforeAll(async () => {
      const { data, error } = await userA.client
        .from("notifications")
        .insert({ type: "TEST", title: "Notificação privada de A" })
        .select("id")
        .single();
      if (error || !data) throw new Error(`fixture: ${error?.message}`);
      notificationOfA = data;
    });

    it("usuário B não lê a notificação de A", async () => {
      const { data } = await userB.client
        .from("notifications")
        .select("*")
        .eq("id", notificationOfA.id)
        .maybeSingle();
      expect(data).toBeNull();
    });

    it("usuário B não marca como lida a notificação de A", async () => {
      const { data } = await userB.client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationOfA.id)
        .select("*");
      expect(data).toEqual([]);
    });

    it("usuário B não exclui a notificação de A", async () => {
      const { data } = await userB.client
        .from("notifications")
        .delete()
        .eq("id", notificationOfA.id)
        .select("*");
      expect(data).toEqual([]);
    });
  });
});
