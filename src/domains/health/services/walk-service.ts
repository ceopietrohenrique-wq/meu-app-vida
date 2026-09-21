import type { SupabaseClient } from "@supabase/supabase-js";

import type { LogWalkInput } from "../schemas/walk-schema";
import { mapWalkLogRow, type WalkLog, type WalkLogRow } from "../types/walk";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listWalkLogsForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<WalkLog[]> {
  const { data, error } = await supabase
    .from("walk_logs")
    .select("*")
    .eq("date", date)
    .returns<WalkLogRow[]>();

  if (error) throwFriendly("Não foi possível carregar as caminhadas do dia.");
  return (data ?? []).map(mapWalkLogRow);
}

type LogWalkRpcResult = {
  walk_log_row: WalkLogRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function logWalk(
  supabase: SupabaseClient,
  input: LogWalkInput,
): Promise<{ walkLog: WalkLog; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("log_walk", {
      p_date: input.date,
      p_duration_minutes: input.durationMinutes,
      p_distance_km: input.distanceKm ?? null,
    })
    .single<LogWalkRpcResult>();

  if (error) throwFriendly("Não foi possível registrar a caminhada.");
  return {
    walkLog: mapWalkLogRow(data!.walk_log_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}
