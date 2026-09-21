import type { SupabaseClient } from "@supabase/supabase-js";

import type { SpiritualSearchInput } from "../schemas/search-schema";
import type { BibleStudyNoteRow } from "../types/bible-study-note";
import type { SavedVerseRow } from "../types/saved-verse";
import type { SpiritualSearchResult } from "../types/search-result";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/**
 * Busca por livro/capítulo/versículo/palavra/tag em bible_study_notes e
 * saved_verses. Cada filtro é aplicado via chamadas parametrizadas do query
 * builder do Supabase (.eq/.ilike/.lte/.gte/.contains) — nunca concatenação
 * de string formando SQL ou filtro dinâmico. A busca por palavra usa
 * `.textSearch()` (full-text search do Postgres via coluna `search_vector`
 * mantida por trigger — ver migration 20260924020000), que cobre título,
 * interpretação pessoal, contexto, dúvidas, aplicação e livro nas notas de
 * estudo, e referência/notas/livro nos versículos salvos — nunca um `.or()`
 * montado com texto livre do usuário. Ver docs/business-rules.md > 18.
 */
export async function searchSpiritual(
  supabase: SupabaseClient,
  filters: SpiritualSearchInput,
): Promise<SpiritualSearchResult[]> {
  const hasAnyFilter =
    filters.book ||
    filters.chapter ||
    filters.verse ||
    filters.word ||
    filters.tag;
  if (!hasAnyFilter) return [];

  let notesQuery = supabase.from("bible_study_notes").select("*");
  let versesQuery = supabase.from("saved_verses").select("*");

  if (filters.book) {
    notesQuery = notesQuery.ilike("book", `%${filters.book}%`);
    versesQuery = versesQuery.ilike("book", `%${filters.book}%`);
  }
  if (filters.chapter) {
    notesQuery = notesQuery.eq("chapter", filters.chapter);
    versesQuery = versesQuery.eq("chapter", filters.chapter);
  }
  if (filters.verse) {
    // O versículo buscado pode cair num intervalo (verse_start..verse_end)
    // ou ser exatamente verse_start quando verse_end é nulo (nota sobre um
    // único versículo). `filters.verse` já passou pelo Zod como número, só
    // dígitos chegam aqui — seguro interpolar na string do filtro (nunca
    // texto livre do usuário).
    const verseFilter = `and(verse_end.is.null,verse_start.eq.${filters.verse}),and(verse_end.not.is.null,verse_start.lte.${filters.verse},verse_end.gte.${filters.verse})`;
    notesQuery = notesQuery.or(verseFilter);
    versesQuery = versesQuery.or(verseFilter);
  }
  if (filters.word) {
    // `.textSearch()` gera o operador `fts` do PostgREST — a palavra vai
    // como parâmetro da query string, nunca concatenada num filtro de
    // texto. `websearch_to_tsquery` aceita entrada de usuário livre sem
    // exigir sintaxe de operadores de busca (trata palavras soltas como
    // "e" implícito).
    notesQuery = notesQuery.textSearch("search_vector", filters.word, {
      type: "websearch",
      config: "portuguese",
    });
    versesQuery = versesQuery.textSearch("search_vector", filters.word, {
      type: "websearch",
      config: "portuguese",
    });
  }
  if (filters.tag) {
    notesQuery = notesQuery.contains("tags", [filters.tag]);
    versesQuery = versesQuery.contains("tags", [filters.tag]);
  }

  const [notesResult, versesResult] = await Promise.all([
    notesQuery.returns<BibleStudyNoteRow[]>(),
    versesQuery.returns<SavedVerseRow[]>(),
  ]);

  if (notesResult.error || versesResult.error) {
    throwFriendly("Não foi possível buscar.");
  }

  const noteResults: SpiritualSearchResult[] = (notesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      type: "bible_study_note",
      title: row.title,
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse_start,
      verseEnd: row.verse_end,
      tags: row.tags,
      createdAt: row.created_at,
    }),
  );

  const verseResults: SpiritualSearchResult[] = (versesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      type: "saved_verse",
      title: row.reference,
      book: row.book,
      chapter: row.chapter,
      verseStart: row.verse_start,
      verseEnd: row.verse_end,
      tags: row.tags,
      createdAt: row.created_at,
    }),
  );

  return [...noteResults, ...verseResults].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
