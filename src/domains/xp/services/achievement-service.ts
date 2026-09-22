import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapUserAchievementRow,
  type UnlockedAchievement,
  type UserAchievementRow,
} from "../types/achievement";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/**
 * Reavalia as condições de conquista (idempotente no banco — ver
 * check_and_unlock_achievements) e devolve a lista completa já desbloqueada.
 * Chamado sempre que a página de Progresso carrega — nunca precisa de um
 * botão manual "verificar conquistas".
 */
export async function listAchievements(
  supabase: SupabaseClient,
): Promise<UnlockedAchievement[]> {
  const { error: checkError } = await supabase.rpc(
    "check_and_unlock_achievements",
  );
  if (checkError) throwFriendly("Não foi possível verificar as conquistas.");

  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .order("unlocked_at", { ascending: false })
    .returns<UserAchievementRow[]>();

  if (error) throwFriendly("Não foi possível carregar as conquistas.");
  return (data ?? []).map(mapUserAchievementRow);
}
