import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateBibleStudyNoteInput } from "../schemas/bible-study-schema";
import {
  mapBibleStudyNoteRow,
  type BibleStudyNote,
  type BibleStudyNoteRow,
} from "../types/bible-study-note";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/** Converte "graça, salvação, fé" em ["graça","salvação","fé"] — nunca string vazia na lista. */
function parseCommaList(value: string | undefined): string[] | null {
  if (!value) return null;
  const items = value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return items.length > 0 ? items : null;
}

export async function listBibleStudyNotes(
  supabase: SupabaseClient,
): Promise<BibleStudyNote[]> {
  const { data, error } = await supabase
    .from("bible_study_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<BibleStudyNoteRow[]>();

  if (error) throwFriendly("Não foi possível carregar as notas de estudo.");
  return (data ?? []).map(mapBibleStudyNoteRow);
}

export async function createBibleStudyNote(
  supabase: SupabaseClient,
  input: CreateBibleStudyNoteInput,
): Promise<BibleStudyNote> {
  const { data, error } = await supabase
    .from("bible_study_notes")
    .insert({
      book: input.book,
      chapter: input.chapter,
      verse_start: input.verseStart ?? null,
      verse_end: input.verseEnd ?? null,
      title: input.title,
      personal_interpretation: input.personalInterpretation ?? null,
      context: input.context ?? null,
      questions: input.questions ?? null,
      application: input.application ?? null,
      cross_references: parseCommaList(input.crossReferences),
      tags: parseCommaList(input.tags),
    })
    .select("*")
    .single<BibleStudyNoteRow>();

  if (error) throwFriendly("Não foi possível salvar a nota de estudo.");
  return mapBibleStudyNoteRow(data!);
}

export async function deleteBibleStudyNote(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("bible_study_notes")
    .delete()
    .eq("id", id);
  if (error) throwFriendly("Não foi possível excluir a nota de estudo.");
}
