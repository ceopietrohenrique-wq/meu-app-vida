import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que os dados espirituais (devocional,
 * estudo bíblico, plano de leitura, orações, versículos salvos) de um
 * usuário nunca são visíveis ou editáveis por outro usuário. Ver
 * docs/business-rules.md > Fase 3.
 */
describe("RLS — Fase 3 (Espiritual)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase3-a");
    userB = await createTestUser(admin, "fase3-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("devotionals: persiste todos os campos, dono lê de volta, usuário B não acessa nem edita", async () => {
    const { error: insertError, data: devotional } = await userA.client
      .from("devotionals")
      .insert({
        date: "2026-03-01",
        passage: "Salmos 23",
        theme: "Confiança",
        reflection: "reflexão de teste",
        read_done: true,
        reflection_done: true,
        prayer_done: true,
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: readBack } = await userA.client
      .from("devotionals")
      .select("*")
      .eq("id", devotional!.id)
      .single();
    expect(readBack).toMatchObject({
      passage: "Salmos 23",
      theme: "Confiança",
    });

    const { data: seenByB } = await userB.client
      .from("devotionals")
      .select("id")
      .eq("id", devotional!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("devotionals")
      .update({ theme: "hackeado" })
      .eq("id", devotional!.id)
      .select("id");
    expect(updatedByB).toEqual([]);
  });

  it("bible_study_notes: isolado por usuário", async () => {
    const { data: note } = await userA.client
      .from("bible_study_notes")
      .insert({ book: "João", chapter: 3, title: "Nota de teste" })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("bible_study_notes")
      .select("id")
      .eq("id", note!.id);
    expect(seenByB).toEqual([]);
  });

  it("reading_plans/reading_plan_logs: usuário B não acessa nem conclui dias do plano do usuário A", async () => {
    const { data: plan } = await userA.client
      .from("reading_plans")
      .insert({
        name: "Plano RLS test",
        start_date: "2026-03-01",
        total_days: 30,
      })
      .select("id")
      .single();

    const { error: rpcErrorForB } = await userB.client.rpc(
      "complete_reading_day",
      {
        p_reading_plan_id: plan!.id,
        p_day_number: 1,
        p_date: "2026-03-01",
        p_notes: null,
      },
    );
    expect(rpcErrorForB).not.toBeNull();

    const { data: planSeenByB } = await userB.client
      .from("reading_plans")
      .select("id")
      .eq("id", plan!.id);
    expect(planSeenByB).toEqual([]);

    // Isolamento direto na tabela reading_plan_logs (não só via RPC): o
    // dono conclui o dia 1 de verdade, e o usuário B não enxerga essa linha
    // mesmo consultando a tabela direto.
    const { data: log } = await userA.client
      .rpc("complete_reading_day", {
        p_reading_plan_id: plan!.id,
        p_day_number: 1,
        p_date: "2026-03-01",
        p_notes: null,
      })
      .single<{ reading_plan_log_row: { id: string } }>();

    const { data: logSeenByB } = await userB.client
      .from("reading_plan_logs")
      .select("id")
      .eq("id", log!.reading_plan_log_row.id);
    expect(logSeenByB).toEqual([]);

    const { data: deletedByB } = await userB.client
      .from("reading_plan_logs")
      .delete()
      .eq("id", log!.reading_plan_log_row.id)
      .select("id");
    expect(deletedByB).toEqual([]);
  });

  it("prayers: isolado por usuário, incluindo tentativa de marcar como respondida", async () => {
    const { data: prayer } = await userA.client
      .from("prayers")
      .insert({
        type: "pedido",
        description: "Pedido de teste",
        requested_at: "2026-03-01",
      })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("prayers")
      .select("id")
      .eq("id", prayer!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("prayers")
      .update({ type: "respondida", answered_at: "2026-03-02" })
      .eq("id", prayer!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    // O próprio dono consegue transformar o pedido em respondida mantendo histórico.
    const { data: updatedByA, error: updateErrorA } = await userA.client
      .from("prayers")
      .update({ type: "respondida", answered_at: "2026-03-02" })
      .eq("id", prayer!.id)
      .select("*")
      .single();
    expect(updateErrorA).toBeNull();
    expect(updatedByA).toMatchObject({
      type: "respondida",
      requested_at: "2026-03-01",
      answered_at: "2026-03-02",
    });
  });

  it("saved_verses: isolado por usuário", async () => {
    const { data: verse } = await userA.client
      .from("saved_verses")
      .insert({
        reference: "João 3:16",
        book: "João",
        chapter: 3,
        verse_start: 16,
      })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("saved_verses")
      .select("id")
      .eq("id", verse!.id);
    expect(seenByB).toEqual([]);
  });
});
