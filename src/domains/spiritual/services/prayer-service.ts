import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreatePrayerInput,
  MarkPrayerAnsweredInput,
} from "../schemas/prayer-schema";
import { mapPrayerRow, type Prayer, type PrayerRow } from "../types/prayer";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listPrayers(supabase: SupabaseClient): Promise<Prayer[]> {
  const { data, error } = await supabase
    .from("prayers")
    .select("*")
    .order("requested_at", { ascending: false })
    .returns<PrayerRow[]>();

  if (error) throwFriendly("Não foi possível carregar as orações.");
  return (data ?? []).map(mapPrayerRow);
}

export async function createPrayer(
  supabase: SupabaseClient,
  input: CreatePrayerInput,
): Promise<Prayer> {
  const { data, error } = await supabase
    .from("prayers")
    .insert({
      type: input.type,
      description: input.description,
      requested_at: input.requestedAt,
      notes: input.notes ?? null,
    })
    .select("*")
    .single<PrayerRow>();

  if (error) throwFriendly("Não foi possível registrar a oração.");
  return mapPrayerRow(data!);
}

/**
 * Transforma um pedido em oração respondida — UPDATE no mesmo registro
 * (nunca cria um novo), mantendo `requested_at` original e preenchendo
 * `answered_at`. Ver docs/business-rules.md > 17.
 */
export async function markPrayerAsAnswered(
  supabase: SupabaseClient,
  id: string,
  input: MarkPrayerAnsweredInput,
): Promise<Prayer> {
  const { data, error } = await supabase
    .from("prayers")
    .update({
      type: "respondida",
      answered_at: input.answeredAt,
      notes: input.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single<PrayerRow>();

  if (error) throwFriendly("Não foi possível marcar a oração como respondida.");
  return mapPrayerRow(data!);
}
