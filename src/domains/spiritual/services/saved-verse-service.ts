import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateSavedVerseInput } from "../schemas/saved-verse-schema";
import {
  mapSavedVerseRow,
  type SavedVerse,
  type SavedVerseRow,
} from "../types/saved-verse";

function throwFriendly(message: string): never {
  throw new Error(message);
}

function parseCommaList(value: string | undefined): string[] | null {
  if (!value) return null;
  const items = value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return items.length > 0 ? items : null;
}

export async function listSavedVerses(
  supabase: SupabaseClient,
): Promise<SavedVerse[]> {
  const { data, error } = await supabase
    .from("saved_verses")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<SavedVerseRow[]>();

  if (error) throwFriendly("Não foi possível carregar os versículos salvos.");
  return (data ?? []).map(mapSavedVerseRow);
}

export async function createSavedVerse(
  supabase: SupabaseClient,
  input: CreateSavedVerseInput,
): Promise<SavedVerse> {
  const { data, error } = await supabase
    .from("saved_verses")
    .insert({
      reference: input.reference,
      book: input.book,
      chapter: input.chapter,
      verse_start: input.verseStart,
      verse_end: input.verseEnd ?? null,
      notes: input.notes ?? null,
      tags: parseCommaList(input.tags),
    })
    .select("*")
    .single<SavedVerseRow>();

  if (error) throwFriendly("Não foi possível salvar o versículo.");
  return mapSavedVerseRow(data!);
}

export async function deleteSavedVerse(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("saved_verses").delete().eq("id", id);
  if (error) throwFriendly("Não foi possível excluir o versículo.");
}
