import type { SupabaseClient } from "@supabase/supabase-js";

import type { UpdateProfileInput } from "../schemas/profile-schema";
import { mapProfileRow, type Profile, type ProfileRow } from "../types/profile";

/**
 * Recebe o client Supabase (server ou browser) por injeção — o service não
 * decide qual client usar, quem chama decide. Isso permite reaproveitar a
 * mesma regra em Server Components e em hooks de client.
 *
 * TODO(fase-0): trocar `SupabaseClient` genérico por `SupabaseClient<Database>`
 * assim que os tipos forem gerados via `supabase gen types` contra o banco
 * com as migrations aplicadas.
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<ProfileRow>();

  if (error) {
    throw new Error("Não foi possível carregar o perfil.");
  }

  return mapProfileRow(data);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: input.name,
      timezone: input.timezone,
      week_start: input.weekStart,
      currency: input.currency.toUpperCase(),
      weekly_xp_goal: input.weeklyXpGoal,
    })
    .eq("id", userId)
    .select("*")
    .single<ProfileRow>();

  if (error) {
    throw new Error("Não foi possível salvar o perfil.");
  }

  return mapProfileRow(data);
}
