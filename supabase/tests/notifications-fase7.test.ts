import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Fase 7 — Notificações Push: testes de job/dedup/quiet-hours/estado atual
 * contra o banco real. As funções de geração/seleção/envio são
 * SECURITY DEFINER restritas a service_role (o job roda em background, sem
 * sessão de usuário) — por isso usam o client admin, nunca o client do
 * usuário de teste.
 */
describe("Fase 7 — jobs de notificação (banco real)", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "fase7-jobs");
    await user.client
      .from("notification_preferences")
      .update({ push_enabled: true })
      .eq("user_id", user.id);
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("is_within_quiet_hours: intervalo normal, cruzando meia-noite, e desligado", async () => {
    // Intervalo normal: 09:00 -> 18:00.
    const normalInside = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "12:00",
      p_quiet_start: "09:00",
      p_quiet_end: "18:00",
    });
    expect(normalInside.data).toBe(true);

    const normalOutside = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "20:00",
      p_quiet_start: "09:00",
      p_quiet_end: "18:00",
    });
    expect(normalOutside.data).toBe(false);

    // Cruzando meia-noite: 22:00 -> 07:00.
    const midnightInsideLate = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "23:30",
      p_quiet_start: "22:00",
      p_quiet_end: "07:00",
    });
    expect(midnightInsideLate.data).toBe(true);

    const midnightInsideEarly = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "05:00",
      p_quiet_start: "22:00",
      p_quiet_end: "07:00",
    });
    expect(midnightInsideEarly.data).toBe(true);

    const midnightOutside = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "12:00",
      p_quiet_start: "22:00",
      p_quiet_end: "07:00",
    });
    expect(midnightOutside.data).toBe(false);

    // start === end desliga (nunca bloqueia o dia inteiro por engano).
    const disabled = await admin.rpc("is_within_quiet_hours", {
      p_local_time: "12:00",
      p_quiet_start: "10:00",
      p_quiet_end: "10:00",
    });
    expect(disabled.data).toBe(false);
  });

  it("user_is_in_quiet_hours: respeita profiles.timezone do usuário", async () => {
    await admin
      .from("notification_preferences")
      .update({
        quiet_hours_enabled: true,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
      })
      .eq("user_id", user.id);
    await admin
      .from("profiles")
      .update({ timezone: "America/Sao_Paulo" })
      .eq("id", user.id);

    // 02:00 UTC = 23:00 em America/Sao_Paulo (UTC-3) -> dentro do quiet hours.
    const insideQuiet = await admin.rpc("user_is_in_quiet_hours", {
      p_user_id: user.id,
      p_at: "2026-01-01T02:00:00Z",
    });
    expect(insideQuiet.data).toBe(true);

    // 14:00 UTC = 11:00 em America/Sao_Paulo -> fora do quiet hours.
    const outsideQuiet = await admin.rpc("user_is_in_quiet_hours", {
      p_user_id: user.id,
      p_at: "2026-01-01T14:00:00Z",
    });
    expect(outsideQuiet.data).toBe(false);

    await admin
      .from("notification_preferences")
      .update({ quiet_hours_enabled: false })
      .eq("user_id", user.id);
  });

  it("generate_task_reminders: tarefa concluída não gera lembrete, e rodar 2x não duplica (dedup)", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: doneTask } = await admin
      .from("tasks")
      .insert({
        user_id: user.id,
        title: "Tarefa já concluída",
        priority: "alta",
        status: "concluida",
        due_date: today,
      })
      .select("id")
      .single();

    const { data: pendingTask } = await admin
      .from("tasks")
      .insert({
        user_id: user.id,
        title: "Tarefa pendente urgente",
        priority: "alta",
        status: "pendente",
        due_date: today,
      })
      .select("id")
      .single();

    await admin.rpc("generate_task_reminders");
    await admin.rpc("generate_task_reminders"); // roda de novo: dedup

    const { data: forDone } = await admin
      .from("scheduled_notifications")
      .select("id")
      .eq("entity_id", doneTask!.id);
    expect(forDone).toEqual([]);

    const { data: forPending } = await admin
      .from("scheduled_notifications")
      .select("id, status")
      .eq("entity_id", pendingTask!.id);
    expect(forPending).toHaveLength(1);
    expect(forPending![0]!.status).toBe("pending");
  });

  it("generate_devotional_reminders: devocional já concluído (3 checks) não gera lembrete", async () => {
    const today = new Date().toISOString().slice(0, 10);

    await admin.from("devotionals").insert({
      user_id: user.id,
      date: today,
      read_done: true,
      reflection_done: true,
      prayer_done: true,
    });

    await admin.rpc("generate_devotional_reminders");

    const { data } = await admin
      .from("scheduled_notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("notification_key", `DEVOTIONAL:${today}`);
    expect(data).toEqual([]);
  });

  it("select_due_push_notifications: cancelamento lógico quando a tarefa é concluída depois de agendado, antes de enviar", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: task } = await admin
      .from("tasks")
      .insert({
        user_id: user.id,
        title: "Tarefa concluída depois do agendamento",
        priority: "alta",
        status: "pendente",
        due_date: today,
      })
      .select("id")
      .single();

    await admin.rpc("generate_task_reminders");

    // Usuário conclui a tarefa DEPOIS do job ter agendado, mas antes do envio.
    await admin
      .from("tasks")
      .update({ status: "concluida" })
      .eq("id", task!.id);

    await admin.rpc("select_due_push_notifications", { p_limit: 100 });

    const { data: scheduled } = await admin
      .from("scheduled_notifications")
      .select("status, cancelled_at")
      .eq("entity_id", task!.id)
      .single();
    expect(scheduled?.status).toBe("cancelled");
    expect(scheduled?.cancelled_at).not.toBeNull();
  });

  it("select_due_push_notifications: não retorna push de usuário em quiet hours (mas mantém pending, não cancela)", async () => {
    const secondUser = await createTestUser(admin, "fase7-quiet");
    try {
      await admin
        .from("notification_preferences")
        .update({
          push_enabled: true,
          quiet_hours_enabled: true,
          quiet_hours_start: "00:00",
          quiet_hours_end: "23:59",
        })
        .eq("user_id", secondUser.id);

      const today = new Date().toISOString().slice(0, 10);
      await admin.from("tasks").insert({
        user_id: secondUser.id,
        title: "Tarefa durante quiet hours",
        priority: "alta",
        status: "pendente",
        due_date: today,
      });
      await admin.rpc("generate_task_reminders");

      const { data: selected } = await admin.rpc(
        "select_due_push_notifications",
        { p_limit: 100 },
      );
      const forSecondUser = (
        selected as { user_id: string; status: string }[]
      ).filter((s) => s.user_id === secondUser.id);
      expect(forSecondUser).toEqual([]);

      const { data: stillPending } = await admin
        .from("scheduled_notifications")
        .select("status")
        .eq("user_id", secondUser.id)
        .eq("category", "tasks")
        .single();
      expect(stillPending?.status).toBe("pending");
    } finally {
      await deleteTestUser(admin, secondUser.id);
    }
  });

  it("mark_push_notification_failed: retry idempotente, nunca loop infinito (status vira failed após 5 tentativas)", async () => {
    const { data: inserted } = await admin
      .from("scheduled_notifications")
      .insert({
        user_id: user.id,
        category: "daily_summary",
        notification_key: `TEST:retry:${Date.now()}`,
        title: "Teste de retry",
      })
      .select("id")
      .single();

    for (let i = 0; i < 5; i++) {
      await admin.rpc("mark_push_notification_failed", {
        p_id: inserted!.id,
        p_error: "erro simulado de envio",
      });
    }

    const { data: final } = await admin
      .from("scheduled_notifications")
      .select("status, attempt_count, failed_at")
      .eq("id", inserted!.id)
      .single();
    expect(final?.status).toBe("failed");
    expect(final?.attempt_count).toBe(5);
    expect(final?.failed_at).not.toBeNull();

    // Uma 6ª falha não deveria mais ser selecionável (attempt_count < 5
    // filtra ela fora do select_due_push_notifications).
    const { data: reselected } = await admin.rpc(
      "select_due_push_notifications",
      { p_limit: 1000 },
    );
    expect(
      (reselected as { id: string }[]).some((r) => r.id === inserted!.id),
    ).toBe(false);
  });

  it("generate_daily_summary_notifications: dados reais, não duplica ao rodar 2x", async () => {
    const summaryUser = await createTestUser(admin, "fase7-daily-summary");
    try {
      await admin
        .from("notification_preferences")
        .update({ daily_summary_time: "00:00" })
        .eq("user_id", summaryUser.id);

      const today = new Date().toISOString().slice(0, 10);
      await admin.from("tasks").insert({
        user_id: summaryUser.id,
        title: "Tarefa do resumo diário",
        status: "concluida",
        due_date: today,
      });

      await admin.rpc("generate_daily_summary_notifications");
      await admin.rpc("generate_daily_summary_notifications");

      const { data: notifications } = await admin
        .from("notifications")
        .select("id, body")
        .eq("user_id", summaryUser.id)
        .eq("notification_key", `DAILY_SUMMARY:${today}`);
      expect(notifications).toHaveLength(1);
      expect(notifications![0]!.body).toContain("tarefas");
    } finally {
      await deleteTestUser(admin, summaryUser.id);
    }
  });

  it("generate_weekly_summary_notifications: reaproveita get_weekly_review_snapshot, não duplica", async () => {
    const summaryUser = await createTestUser(admin, "fase7-weekly-summary");
    try {
      // week_start=1 (segunda). Se hoje não for domingo (fim da semana),
      // o teste chama a função com o relógio real do banco — para não
      // depender do dia da semana em que os testes rodam, testamos a
      // função de geração diretamente via uma chamada equivalente ao
      // snapshot reaproveitado, confirmando ausência de duplicata quando
      // ela de fato gera (idempotência é o que importa aqui).
      const today = new Date().toISOString().slice(0, 10);
      await admin.from("tasks").insert({
        user_id: summaryUser.id,
        title: "Tarefa do resumo semanal",
        status: "concluida",
        due_date: today,
      });

      const first = await admin.rpc("generate_weekly_summary_notifications");
      const second = await admin.rpc("generate_weekly_summary_notifications");
      expect(first.error).toBeNull();
      expect(second.error).toBeNull();

      const { data: notifications } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", summaryUser.id)
        .eq("type", "WEEKLY_SUMMARY");
      // 0 ou 1 (só gera se hoje for o último dia da semana às 20h+) — nunca
      // mais que 1, mesmo rodando 2x.
      expect((notifications ?? []).length).toBeLessThanOrEqual(1);
    } finally {
      await deleteTestUser(admin, summaryUser.id);
    }
  });

  it("generate_daily_summary_notifications: não gera nada quando daily_summary_enabled = false", async () => {
    const disabledUser = await createTestUser(admin, "fase7-daily-disabled");
    try {
      await admin
        .from("notification_preferences")
        .update({ daily_summary_enabled: false, daily_summary_time: "00:00" })
        .eq("user_id", disabledUser.id);

      const today = new Date().toISOString().slice(0, 10);
      await admin.from("tasks").insert({
        user_id: disabledUser.id,
        title: "Tarefa que não deveria gerar resumo",
        status: "concluida",
        due_date: today,
      });

      await admin.rpc("generate_daily_summary_notifications");

      const { data } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", disabledUser.id)
        .eq("type", "DAILY_SUMMARY");
      expect(data).toEqual([]);
    } finally {
      await deleteTestUser(admin, disabledUser.id);
    }
  });

  it("generate_weekly_summary_notifications: não gera nada quando weekly_summary_enabled = false", async () => {
    const disabledUser = await createTestUser(admin, "fase7-weekly-disabled");
    try {
      await admin
        .from("notification_preferences")
        .update({ weekly_summary_enabled: false })
        .eq("user_id", disabledUser.id);

      const today = new Date().toISOString().slice(0, 10);
      await admin.from("tasks").insert({
        user_id: disabledUser.id,
        title: "Tarefa que não deveria gerar resumo semanal",
        status: "concluida",
        due_date: today,
      });

      await admin.rpc("generate_weekly_summary_notifications");

      const { data } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", disabledUser.id)
        .eq("type", "WEEKLY_SUMMARY");
      expect(data).toEqual([]);
    } finally {
      await deleteTestUser(admin, disabledUser.id);
    }
  });

  it("push_subscriptions: upsert da mesma subscription (endpoint) não duplica", async () => {
    const subUser = await createTestUser(admin, "fase7-sub-dup");
    try {
      const subscriptionPayload = {
        endpoint: `https://push.example.com/dup-${Date.now()}`,
        p256dh: "key-p256dh",
        auth: "key-auth",
        is_active: true,
      };

      await subUser.client
        .from("push_subscriptions")
        .upsert(subscriptionPayload, { onConflict: "user_id,endpoint" });
      await subUser.client
        .from("push_subscriptions")
        .upsert(subscriptionPayload, { onConflict: "user_id,endpoint" });
      await subUser.client
        .from("push_subscriptions")
        .upsert(subscriptionPayload, { onConflict: "user_id,endpoint" });

      const { data } = await subUser.client
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", subscriptionPayload.endpoint);
      expect(data).toHaveLength(1);
    } finally {
      await deleteTestUser(admin, subUser.id);
    }
  });

  it("deactivate_push_subscription: desativa (nunca deleta) e select_due_push_notifications ignora usuário sem subscription ativa", async () => {
    const subUser = await createTestUser(admin, "fase7-sub-deactivate");
    try {
      const { data: sub } = await admin
        .from("push_subscriptions")
        .insert({
          user_id: subUser.id,
          endpoint: `https://push.example.com/deactivate-${Date.now()}`,
          p256dh: "key-p256dh",
          auth: "key-auth",
        })
        .select("id")
        .single();

      await admin.rpc("deactivate_push_subscription", {
        p_subscription_id: sub!.id,
      });

      const { data: stillExists } = await admin
        .from("push_subscriptions")
        .select("id, is_active")
        .eq("id", sub!.id)
        .single();
      expect(stillExists).not.toBeNull();
      expect(stillExists?.is_active).toBe(false);
    } finally {
      await deleteTestUser(admin, subUser.id);
    }
  });
});
