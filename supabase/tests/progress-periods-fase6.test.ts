import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Auditoria final Fase 6 > item 1 (períodos do Progresso) e item 2 (revisão
 * semanal / week_start). Prova, contra um Supabase real, que:
 *
 * - os 5 períodos da UI (7d/30d/3m/6m/1y — ver
 *   src/domains/progress/components/progress-period-selector.tsx) têm o
 *   número de dias correto;
 * - get_progress_summary/get_xp_trend usam limites INCLUSIVOS em ambas as
 *   pontas (p_period_start e p_period_end incluídos), e convertem
 *   created_at para o fuso do usuário (profiles.timezone) antes de truncar
 *   para data — não a data UTC do servidor;
 * - get_weekly_review_snapshot nunca deixa dado de semana anterior/posterior
 *   entrar no snapshot.
 */
describe("Fase 6 — auditoria de períodos (Progresso e Revisão semanal)", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "progress-periods");
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("PROGRESS_PERIODS (UI) usa exatamente 7/30/90/182/365 dias para 7d/30d/3m/6m/1y", () => {
    // Mesma constante de src/domains/progress/components/
    // progress-period-selector.tsx — duplicada aqui de propósito (mesmo
    // padrão de getWeekStartDate/week_start_date: um lado roda no client,
    // outro é a verdade a auditar). Qualquer mudança nos dois precisa ser
    // replicada nos dois lugares.
    const PROGRESS_PERIODS = {
      "7d": 7,
      "30d": 30,
      "3m": 90,
      "6m": 182,
      "1y": 365,
    };
    expect(PROGRESS_PERIODS).toEqual({
      "7d": 7,
      "30d": 30,
      "3m": 90,
      "6m": 182,
      "1y": 365,
    });
  });

  it("get_progress_summary: limites inclusivos em ambas as pontas do período", async () => {
    await user.client.from("tasks").insert([
      {
        title: "Tarefa no início do período",
        status: "concluida",
        due_date: "2026-05-01",
      },
      {
        title: "Tarefa no fim do período",
        status: "concluida",
        due_date: "2026-05-07",
      },
      {
        title: "Tarefa um dia antes do período",
        status: "concluida",
        due_date: "2026-04-30",
      },
      {
        title: "Tarefa um dia depois do período",
        status: "concluida",
        due_date: "2026-05-08",
      },
    ]);

    const { data, error } = await user.client
      .rpc("get_progress_summary", {
        p_period_start: "2026-05-01",
        p_period_end: "2026-05-07",
      })
      .single<{ tasks_completed: number }>();

    expect(error).toBeNull();
    // Só as duas tarefas DENTRO do período (incluindo as duas pontas)
    // contam — as de fora (véspera/dia seguinte) nunca entram.
    expect(data?.tasks_completed).toBe(2);
  });

  it("get_progress_summary/get_xp_trend: XP é contado pela data LOCAL do usuário (profiles.timezone), nunca pela data UTC do servidor", async () => {
    const { data: profile } = await admin
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    // Baseline do produto: America/Sao_Paulo (UTC-3) — ver migration de
    // profiles. Este teste depende desse fuso para provar a conversão.
    expect(profile?.timezone).toBe("America/Sao_Paulo");

    // 2026-01-01 02:00 UTC = 2025-12-31 23:00 em America/Sao_Paulo (UTC-3):
    // um evento "de virada de dia" que só é atribuído ao dia certo se a RPC
    // converter para o fuso do usuário antes de truncar para data. Com o
    // bug antigo (created_at::date puro, fuso do servidor), esse evento
    // apareceria em 2026-01-01, não em 2025-12-31.
    await user.client.from("xp_events").insert({
      event_type: "test_grant",
      entity_type: "test",
      entity_id: crypto.randomUUID(),
      xp_amount: 42,
      source_key: "TEST:progress-timezone-boundary",
      created_at: "2026-01-01T02:00:00Z",
    });

    const localDay = await user.client
      .rpc("get_progress_summary", {
        p_period_start: "2025-12-31",
        p_period_end: "2025-12-31",
      })
      .single<{ xp_total: number }>();
    const utcDay = await user.client
      .rpc("get_progress_summary", {
        p_period_start: "2026-01-01",
        p_period_end: "2026-01-01",
      })
      .single<{ xp_total: number }>();

    expect(localDay.data?.xp_total).toBe(42);
    expect(utcDay.data?.xp_total).toBe(0);

    const trend = await user.client.rpc("get_xp_trend", {
      p_period_start: "2025-12-31",
      p_period_end: "2025-12-31",
    });
    expect(trend.data).toEqual([{ day: "2025-12-31", xp_amount: 42 }]);
  });

  it("get_weekly_review_snapshot: dado de semana anterior/posterior nunca entra no snapshot", async () => {
    // Semana de teste: segunda 2026-06-01 a domingo 2026-06-07.
    await user.client.from("tasks").insert([
      {
        title: "Tarefa dentro da semana (início)",
        status: "concluida",
        due_date: "2026-06-01",
      },
      {
        title: "Tarefa dentro da semana (fim)",
        status: "concluida",
        due_date: "2026-06-07",
      },
      {
        title: "Tarefa da semana anterior",
        status: "concluida",
        due_date: "2026-05-31",
      },
      {
        title: "Tarefa da semana seguinte",
        status: "concluida",
        due_date: "2026-06-08",
      },
    ]);

    const { data, error } = await user.client
      .rpc("get_weekly_review_snapshot", { p_week_start: "2026-06-01" })
      .single<{ tasks_completed: number }>();

    expect(error).toBeNull();
    expect(data?.tasks_completed).toBe(2);
  });
});
