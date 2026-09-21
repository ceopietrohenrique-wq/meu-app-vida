import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que o XP espiritual (devocional, plano de
 * leitura) nunca é concedido duas vezes para o mesmo evento, e que ele só é
 * concedido quando o comportamento realmente aconteceu (checklist completo
 * do devocional) — nunca por "quantidade" ou métrica de progresso. Ver
 * docs/business-rules.md > 14.
 */
describe("XP Espiritual — idempotente", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "xp-fase3");
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

  describe("devocional", () => {
    it("checklist incompleto não concede XP", async () => {
      const date = "2026-03-10";
      const sourceKey = `DEVOTIONAL:${date}`;

      const result = await user.client
        .rpc("log_devotional", {
          p_date: date,
          p_read_done: true,
          p_reflection_done: false,
          p_prayer_done: false,
        })
        .single<{ xp_awarded: boolean }>();

      expect(result.data?.xp_awarded).toBe(false);
      expect(await xpEventCount(sourceKey)).toBe(0);
    });

    it("completar o checklist concede XP uma única vez, mesmo reenviando várias vezes", async () => {
      const date = "2026-03-11";
      const sourceKey = `DEVOTIONAL:${date}`;

      const first = await user.client
        .rpc("log_devotional", {
          p_date: date,
          p_read_done: true,
          p_reflection_done: true,
          p_prayer_done: true,
        })
        .single<{ xp_awarded: boolean; xp_amount: number }>();
      expect(first.data?.xp_awarded).toBe(true);
      expect(first.data?.xp_amount).toBe(10);
      expect(await xpEventCount(sourceKey)).toBe(1);

      // Reenviar o mesmo dia (upsert) não duplica XP.
      const second = await user.client
        .rpc("log_devotional", {
          p_date: date,
          p_theme: "atualizado",
          p_read_done: true,
          p_reflection_done: true,
          p_prayer_done: true,
        })
        .single<{ xp_awarded: boolean }>();
      expect(second.data?.xp_awarded).toBe(false);
      expect(await xpEventCount(sourceKey)).toBe(1);

      // O upsert não cria um segundo registro para o mesmo dia.
      const { data: devotionals } = await admin
        .from("devotionals")
        .select("id, theme")
        .eq("user_id", user.id)
        .eq("date", date);
      expect(devotionals).toHaveLength(1);
      expect(devotionals![0]!.theme).toBe("atualizado");
    });

    it("desmarcar e remarcar o checklist no mesmo dia não permite farmar XP", async () => {
      const date = "2026-03-13";
      const sourceKey = `DEVOTIONAL:${date}`;

      const completed = await user.client
        .rpc("log_devotional", {
          p_date: date,
          p_read_done: true,
          p_reflection_done: true,
          p_prayer_done: true,
        })
        .single<{ xp_awarded: boolean }>();
      expect(completed.data?.xp_awarded).toBe(true);
      expect(await xpEventCount(sourceKey)).toBe(1);

      // Desmarca um item do checklist — não revoga o XP já concedido
      // (mesma regra 1.4 dos hábitos: histórico de xp_events é imutável).
      await user.client.rpc("log_devotional", {
        p_date: date,
        p_read_done: true,
        p_reflection_done: false,
        p_prayer_done: true,
      });
      expect(await xpEventCount(sourceKey)).toBe(1);

      // Remarca de novo — mesmo source_key, bloqueado pela constraint.
      const remarked = await user.client
        .rpc("log_devotional", {
          p_date: date,
          p_read_done: true,
          p_reflection_done: true,
          p_prayer_done: true,
        })
        .single<{ xp_awarded: boolean }>();
      expect(remarked.data?.xp_awarded).toBe(false);
      expect(await xpEventCount(sourceKey)).toBe(1);
    });

    it("usuário B chamando log_devotional nunca lê nem altera o devocional do usuário A", async () => {
      const admin2 = createAdminTestClient();
      const userB = await createTestUser(admin2, "xp-fase3-devotional-b");
      const date = "2026-03-14";

      await user.client.rpc("log_devotional", {
        p_date: date,
        p_theme: "tema do usuário A",
        p_read_done: true,
        p_reflection_done: true,
        p_prayer_done: true,
      });

      // B registra o devocional do MESMO dia — a RPC só opera sobre
      // auth.uid(), então isso cria/edita o devocional de B, nunca o de A
      // (o UPSERT conflita em (user_id, date), e user_id de B é diferente).
      await userB.client.rpc("log_devotional", {
        p_date: date,
        p_theme: "tema do usuário B",
        p_read_done: true,
        p_reflection_done: true,
        p_prayer_done: true,
      });

      const { data: devotionalA } = await admin
        .from("devotionals")
        .select("theme")
        .eq("user_id", user.id)
        .eq("date", date)
        .single();
      expect(devotionalA?.theme).toBe("tema do usuário A");

      const { data: devotionalB } = await admin
        .from("devotionals")
        .select("theme")
        .eq("user_id", userB.id)
        .eq("date", date)
        .single();
      expect(devotionalB?.theme).toBe("tema do usuário B");

      await deleteTestUser(admin2, userB.id);
    });
  });

  describe("plano de leitura", () => {
    it("concluir o mesmo dia sequencialmente duas vezes não duplica XP nem o log", async () => {
      const { data: plan } = await user.client
        .from("reading_plans")
        .insert({
          name: "Plano XP test sequencial",
          start_date: "2026-03-01",
          total_days: 30,
        })
        .select("id")
        .single();

      const date = "2026-03-15";
      const sourceKey = `READING_PLAN:${plan!.id}:1`;

      const first = await user.client
        .rpc("complete_reading_day", {
          p_reading_plan_id: plan!.id,
          p_day_number: 1,
          p_date: date,
          p_notes: null,
        })
        .single<{ xp_awarded: boolean }>();
      expect(first.data?.xp_awarded).toBe(true);

      const second = await user.client
        .rpc("complete_reading_day", {
          p_reading_plan_id: plan!.id,
          p_day_number: 1,
          p_date: date,
          p_notes: null,
        })
        .single<{ xp_awarded: boolean }>();
      expect(second.data?.xp_awarded).toBe(false);

      expect(await xpEventCount(sourceKey)).toBe(1);
      const { data: logs } = await admin
        .from("reading_plan_logs")
        .select("id")
        .eq("reading_plan_id", plan!.id)
        .eq("day_number", 1);
      expect(logs).toHaveLength(1);
    });

    it("concluir o mesmo dia duas vezes (concorrente) não duplica XP nem o log", async () => {
      const { data: plan } = await user.client
        .from("reading_plans")
        .insert({
          name: "Plano XP test",
          start_date: "2026-03-01",
          total_days: 30,
        })
        .select("id")
        .single();

      const date = "2026-03-12";
      const sourceKey = `READING_PLAN:${plan!.id}:1`;

      const [first, second] = await Promise.all([
        user.client
          .rpc("complete_reading_day", {
            p_reading_plan_id: plan!.id,
            p_day_number: 1,
            p_date: date,
            p_notes: null,
          })
          .single<{ xp_awarded: boolean }>(),
        user.client
          .rpc("complete_reading_day", {
            p_reading_plan_id: plan!.id,
            p_day_number: 1,
            p_date: date,
            p_notes: null,
          })
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

      const { data: logs } = await admin
        .from("reading_plan_logs")
        .select("id")
        .eq("reading_plan_id", plan!.id)
        .eq("day_number", 1);
      expect(logs).toHaveLength(1);
    });

    it("dias diferentes do mesmo plano concedem XP independentemente", async () => {
      const { data: plan } = await user.client
        .from("reading_plans")
        .insert({
          name: "Plano XP test 2",
          start_date: "2026-03-01",
          total_days: 30,
        })
        .select("id")
        .single();

      await user.client.rpc("complete_reading_day", {
        p_reading_plan_id: plan!.id,
        p_day_number: 1,
        p_date: "2026-03-01",
        p_notes: null,
      });
      const secondDay = await user.client
        .rpc("complete_reading_day", {
          p_reading_plan_id: plan!.id,
          p_day_number: 2,
          p_date: "2026-03-02",
          p_notes: null,
        })
        .single<{ xp_awarded: boolean }>();

      expect(secondDay.data?.xp_awarded).toBe(true);
      expect(await xpEventCount(`READING_PLAN:${plan!.id}:1`)).toBe(1);
      expect(await xpEventCount(`READING_PLAN:${plan!.id}:2`)).toBe(1);
    });
  });
});
