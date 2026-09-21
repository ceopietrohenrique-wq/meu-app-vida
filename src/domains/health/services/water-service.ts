import type { SupabaseClient } from "@supabase/supabase-js";

import type { SetWaterGoalInput } from "../schemas/water-schema";
import {
  mapLogWaterRpcResult,
  mapWaterLogRow,
  mapWaterSettingsRow,
  type LogWaterResult,
  type LogWaterRpcResult,
  type WaterLog,
  type WaterLogRow,
  type WaterSettings,
  type WaterSettingsRow,
} from "../types/water";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function getWaterSettings(
  supabase: SupabaseClient,
): Promise<WaterSettings> {
  const { data, error } = await supabase
    .from("water_settings")
    .select("*")
    .maybeSingle<WaterSettingsRow>();

  if (error) throwFriendly("Não foi possível carregar a meta de água.");
  return data ? mapWaterSettingsRow(data) : { dailyGoalMl: 2000 };
}

export async function listWaterLogsForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true })
    .returns<WaterLogRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o registro de água do dia.");
  return (data ?? []).map(mapWaterLogRow);
}

export async function logWater(
  supabase: SupabaseClient,
  amountMl: number,
  date: string,
): Promise<LogWaterResult> {
  const { data, error } = await supabase
    .rpc("log_water", { p_amount_ml: amountMl, p_date: date })
    .single<LogWaterRpcResult>();

  if (error) throwFriendly("Não foi possível registrar a água.");
  return mapLogWaterRpcResult(data!);
}

export async function setWaterGoal(
  supabase: SupabaseClient,
  input: SetWaterGoalInput,
): Promise<WaterSettings> {
  const { data, error } = await supabase
    .rpc("set_water_goal", { p_daily_goal_ml: input.dailyGoalMl })
    .single<WaterSettingsRow>();

  if (error) throwFriendly("Não foi possível salvar a meta de água.");
  return mapWaterSettingsRow(data!);
}
