import type { SupabaseClient } from "@supabase/supabase-js";

import type { LogDevotionalInput } from "../schemas/devotional-schema";
import {
  mapDevotionalRow,
  type Devotional,
  type DevotionalRow,
} from "../types/devotional";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listDevotionalsSince(
  supabase: SupabaseClient,
  sinceDate: string,
): Promise<Devotional[]> {
  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .gte("date", sinceDate)
    .order("date", { ascending: true })
    .returns<DevotionalRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico do devocional.");
  return (data ?? []).map(mapDevotionalRow);
}

export async function getDevotionalForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<Devotional | null> {
  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .eq("date", date)
    .maybeSingle<DevotionalRow>();

  if (error) throwFriendly("Não foi possível carregar o devocional do dia.");
  return data ? mapDevotionalRow(data) : null;
}

type LogDevotionalRpcResult = {
  devotional_row: DevotionalRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function logDevotional(
  supabase: SupabaseClient,
  input: LogDevotionalInput,
): Promise<{ devotional: Devotional; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("log_devotional", {
      p_date: input.date,
      p_passage: input.passage ?? null,
      p_theme: input.theme ?? null,
      p_reflection: input.reflection ?? null,
      p_learning: input.learning ?? null,
      p_application: input.application ?? null,
      p_prayer: input.prayer ?? null,
      p_duration_minutes: input.durationMinutes ?? null,
      p_notes: input.notes ?? null,
      p_read_done: input.readDone,
      p_reflection_done: input.reflectionDone,
      p_prayer_done: input.prayerDone,
    })
    .single<LogDevotionalRpcResult>();

  if (error) throwFriendly("Não foi possível salvar o devocional.");
  return {
    devotional: mapDevotionalRow(data!.devotional_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}
