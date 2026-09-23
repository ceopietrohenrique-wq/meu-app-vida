import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Fase 7 — Notificações Push: prova, contra um Supabase real, que usuário A
 * nunca lê subscription/preferência de B, nunca altera preferência de B, e
 * nunca dispara envio usando subscription de B. Ver docs/business-rules.md
 * > Fase 7 > Segurança.
 */
describe("RLS — Fase 7 (Push)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase7-a");
    userB = await createTestUser(admin, "fase7-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("push_subscriptions: isolado por usuário, B nunca lê/altera/apaga subscription de A", async () => {
    const { data: subA, error } = await userA.client
      .from("push_subscriptions")
      .insert({
        endpoint: "https://push.example.com/sub-a",
        p256dh: "key-p256dh-a",
        auth: "key-auth-a",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("push_subscriptions")
      .select("id")
      .eq("id", subA!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("id", subA!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    const { data: deletedByB } = await userB.client
      .from("push_subscriptions")
      .delete()
      .eq("id", subA!.id)
      .select("id");
    expect(deletedByB).toEqual([]);

    const { data: stillThere } = await admin
      .from("push_subscriptions")
      .select("id, is_active")
      .eq("id", subA!.id)
      .single();
    expect(stillThere?.is_active).toBe(true);
  });

  it("push_subscriptions: nunca expõe secret de servidor — só chaves públicas do próprio dispositivo do usuário", async () => {
    const { data: subA } = await userA.client
      .from("push_subscriptions")
      .select("*")
      .limit(1)
      .single();
    // Nenhuma coluna de secret do servidor (VAPID private key) existe nesta
    // tabela — só o que o próprio browser do usuário já gerou/expõe.
    expect(Object.keys(subA!)).not.toContain("vapid_private_key");
    expect(Object.keys(subA!)).not.toContain("service_role_key");
  });

  it("notification_preferences: isolado por usuário, B nunca lê/altera preferência de A", async () => {
    const { data: seenByB } = await userB.client
      .from("notification_preferences")
      .select("user_id")
      .eq("user_id", userA.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("notification_preferences")
      .update({ push_enabled: true })
      .eq("user_id", userA.id)
      .select("user_id");
    expect(updatedByB).toEqual([]);

    const { data: prefsA } = await admin
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", userA.id)
      .single();
    expect(prefsA?.push_enabled).toBe(false);
  });

  it("notification_preferences: linha é criada automaticamente para todo usuário novo", async () => {
    const { data } = await userA.client
      .from("notification_preferences")
      .select("user_id, in_app_enabled, push_enabled")
      .eq("user_id", userA.id)
      .single();
    expect(data).not.toBeNull();
    expect(data?.in_app_enabled).toBe(true);
    expect(data?.push_enabled).toBe(false);
  });

  it("scheduled_notifications: B nunca lê a fila de push de A", async () => {
    await admin.from("scheduled_notifications").insert({
      user_id: userA.id,
      category: "daily_summary",
      notification_key: `TEST:rls:${Date.now()}`,
      title: "Notificação de A",
    });

    const { data: seenByB } = await userB.client
      .from("scheduled_notifications")
      .select("id")
      .eq("user_id", userA.id);
    expect(seenByB).toEqual([]);

    const { data: seenByA } = await userA.client
      .from("scheduled_notifications")
      .select("id")
      .eq("user_id", userA.id);
    expect((seenByA ?? []).length).toBeGreaterThan(0);
  });

  it("scheduled_notifications: usuário comum (client anon/authenticated) não pode inserir/atualizar diretamente — só as funções SECURITY DEFINER podem", async () => {
    const { error: insertError } = await userA.client
      .from("scheduled_notifications")
      .insert({
        user_id: userA.id,
        category: "daily_summary",
        notification_key: `TEST:direct-insert:${Date.now()}`,
        title: "Tentativa de insert direto",
      });
    expect(insertError).not.toBeNull();

    const { data: anyRow } = await admin
      .from("scheduled_notifications")
      .select("id")
      .eq("user_id", userA.id)
      .limit(1)
      .single();
    // Sem policy de UPDATE, a RLS simplesmente não expõe nenhuma linha para
    // atualizar — PostgREST devolve sucesso com 0 linhas afetadas, não um
    // erro (mesmo comportamento de "linha de outro usuário" em toda a
    // suíte). O que prova a proteção é a linha continuar como estava.
    const { data: updatedRows } = await userA.client
      .from("scheduled_notifications")
      .update({ status: "sent" })
      .eq("id", anyRow!.id)
      .select("id");
    expect(updatedRows).toEqual([]);

    const { data: stillPending } = await admin
      .from("scheduled_notifications")
      .select("status")
      .eq("id", anyRow!.id)
      .single();
    expect(stillPending?.status).toBe("pending");
  });

  it("get_progress_summary/get_weekly_review_snapshot: authenticated não pode passar p_user_id de outro usuário; service_role pode (job de resumo)", async () => {
    const today = new Date().toISOString().slice(0, 10);

    await admin.from("tasks").insert({
      user_id: userB.id,
      title: "Tarefa privada de B",
      status: "concluida",
      due_date: today,
    });

    const crossUserSummary = await userA.client.rpc("get_progress_summary", {
      p_period_start: today,
      p_period_end: today,
      p_user_id: userB.id,
    });
    expect(crossUserSummary.error).not.toBeNull();
    expect(crossUserSummary.error!.message).toMatch(/acesso negado/i);

    const ownSummary = await userA.client.rpc("get_progress_summary", {
      p_period_start: today,
      p_period_end: today,
    });
    expect(ownSummary.error).toBeNull();

    const serviceSummary = await admin
      .rpc("get_progress_summary", {
        p_period_start: today,
        p_period_end: today,
        p_user_id: userB.id,
      })
      .single<{ tasks_completed: number }>();
    expect(serviceSummary.error).toBeNull();
    expect(serviceSummary.data?.tasks_completed).toBeGreaterThanOrEqual(1);

    const crossUserWeekly = await userA.client.rpc(
      "get_weekly_review_snapshot",
      { p_week_start: "2026-01-05", p_user_id: userB.id },
    );
    expect(crossUserWeekly.error).not.toBeNull();
    expect(crossUserWeekly.error!.message).toMatch(/acesso negado/i);

    const serviceWeekly = await admin.rpc("get_weekly_review_snapshot", {
      p_week_start: "2026-01-05",
      p_user_id: userB.id,
    });
    expect(serviceWeekly.error).toBeNull();
  });

  it("select_due_push_notifications/mark_push_notification_sent: authenticated não pode chamar as RPCs restritas a service_role", async () => {
    const { error: selectError } = await userA.client.rpc(
      "select_due_push_notifications",
      { p_limit: 10 },
    );
    expect(selectError).not.toBeNull();

    const { error: markError } = await userA.client.rpc(
      "mark_push_notification_sent",
      { p_id: "00000000-0000-0000-0000-000000000000" },
    );
    expect(markError).not.toBeNull();

    const { error: generateError } = await userA.client.rpc(
      "generate_scheduled_notifications",
    );
    expect(generateError).not.toBeNull();
  });
});
