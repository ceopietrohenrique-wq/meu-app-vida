import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que a busca textual (full-text search via
 * `search_vector` + `.textSearch()`) funciona no conteúdo das notas de
 * estudo, não só no título, e que continua isolada por usuário. Ver
 * docs/business-rules.md > 18.
 */
describe("Busca espiritual — full-text search", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "search-a");
    userB = await createTestUser(admin, "search-b");

    await userA.client.from("bible_study_notes").insert({
      book: "Romanos",
      chapter: 8,
      title: "Nada nos separa",
      personal_interpretation:
        "O amor de Deus é inabalável mesmo na tribulação.",
      context: "Paulo escreve sobre a certeza da salvação.",
      questions: "O que significa mais que vencedores?",
      application: "Confiar mesmo em dificuldade.",
      tags: ["confianca", "amor"],
    });

    await userB.client.from("bible_study_notes").insert({
      book: "Romanos",
      chapter: 8,
      title: "Nota do usuário B",
      personal_interpretation: "tribulação também aparece aqui",
    });
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("encontra a nota por uma palavra que só existe no corpo (não no título)", async () => {
    const { data, error } = await userA.client
      .from("bible_study_notes")
      .select("id, title")
      .textSearch("search_vector", "tribulação", {
        type: "websearch",
        config: "portuguese",
      });

    expect(error).toBeNull();
    expect(data?.map((n) => n.title)).toContain("Nada nos separa");
  });

  it("palavra inexistente não encontra nada", async () => {
    const { data, error } = await userA.client
      .from("bible_study_notes")
      .select("id")
      .textSearch("search_vector", "abracadabra", {
        type: "websearch",
        config: "portuguese",
      });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuário A nunca recebe notas do usuário B na busca por palavra", async () => {
    const { data } = await userA.client
      .from("bible_study_notes")
      .select("id, title")
      .textSearch("search_vector", "tribulação", {
        type: "websearch",
        config: "portuguese",
      });

    expect(data?.some((n) => n.title === "Nota do usuário B")).toBe(false);
  });

  it("filtro por livro continua funcionando", async () => {
    const { data, error } = await userA.client
      .from("bible_study_notes")
      .select("id")
      .ilike("book", "%Romanos%");

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it("filtro por tag continua funcionando", async () => {
    const { data, error } = await userA.client
      .from("bible_study_notes")
      .select("id")
      .contains("tags", ["confianca"]);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
