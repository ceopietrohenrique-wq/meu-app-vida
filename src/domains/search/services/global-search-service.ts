import type { SupabaseClient } from "@supabase/supabase-js";

import type { GlobalSearchResult } from "../types/search-result";

const RESULTS_PER_TYPE = 5;

/**
 * Busca global (CLAUDE.md > Fase 6): tarefas, clientes, notas de estudo
 * bíblico e itens de catálogo (produtos/serviços). `ideias`/`notas`/
 * `projetos` da spec original não existem no produto ainda (pastas de
 * domínio vazias desde a Fase 0, nenhuma fase implementou essas tabelas) —
 * fora do escopo desta fase, ver docs/architecture.md.
 *
 * Cada entidade é uma chamada PARAMETRIZADA e independente ao Supabase
 * (`.ilike()` sempre envia o termo como parâmetro, nunca concatenado em SQL
 * — nunca uma query insegura montada por string), todas protegidas por RLS.
 * Rodam em paralelo (Promise.all), nunca uma única query gigante.
 */
export async function searchGlobal(
  supabase: SupabaseClient,
  term: string,
): Promise<GlobalSearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;

  const [tasks, customers, bibleStudyNotes, catalogItems] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title")
      .ilike("title", pattern)
      .limit(RESULTS_PER_TYPE)
      .returns<{ id: string; title: string }[]>(),
    supabase
      .from("customers")
      .select("id, name, company")
      .ilike("name", pattern)
      .limit(RESULTS_PER_TYPE)
      .returns<{ id: string; name: string; company: string | null }[]>(),
    supabase
      .from("bible_study_notes")
      .select("id, title, book")
      .ilike("title", pattern)
      .limit(RESULTS_PER_TYPE)
      .returns<{ id: string; title: string; book: string }[]>(),
    supabase
      .from("catalog_items")
      .select("id, name, type")
      .ilike("name", pattern)
      .limit(RESULTS_PER_TYPE)
      .returns<{ id: string; name: string; type: string }[]>(),
  ]);

  const results: GlobalSearchResult[] = [];

  for (const task of tasks.data ?? []) {
    results.push({
      type: "task",
      id: task.id,
      title: task.title,
      subtitle: "Tarefa",
      href: "/",
    });
  }
  for (const customer of customers.data ?? []) {
    results.push({
      type: "customer",
      id: customer.id,
      title: customer.name,
      subtitle: customer.company || "Cliente/lead",
      href: "/negocios#clientes",
    });
  }
  for (const note of bibleStudyNotes.data ?? []) {
    results.push({
      type: "bible_study_note",
      id: note.id,
      title: note.title,
      subtitle: note.book,
      href: "/espiritual#estudo",
    });
  }
  for (const item of catalogItems.data ?? []) {
    results.push({
      type: "catalog_item",
      id: item.id,
      title: item.name,
      subtitle: item.type === "produto" ? "Produto" : "Serviço",
      href: "/negocios#catalogo",
    });
  }

  return results;
}
