import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LogWeightInput,
  SetWeightGoalInput,
} from "../schemas/weight-schema";
import {
  mapWeightGoalRow,
  mapWeightLogRow,
  type WeightGoal,
  type WeightGoalRow,
  type WeightLog,
  type WeightLogRow,
} from "../types/weight";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listWeightLogsSince(
  supabase: SupabaseClient,
  sinceDate: string,
): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .gte("date", sinceDate)
    .order("date", { ascending: true })
    .returns<WeightLogRow[]>();

  if (error) throwFriendly("Não foi possível carregar o histórico de peso.");
  return (data ?? []).map(mapWeightLogRow);
}

type LogWeightRpcResult = {
  weight_log_row: WeightLogRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function logWeight(
  supabase: SupabaseClient,
  input: LogWeightInput,
): Promise<{ weightLog: WeightLog; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("log_weight", {
      p_weight_kg: input.weightKg,
      p_date: input.date,
      p_notes: input.notes ?? null,
    })
    .single<LogWeightRpcResult>();

  if (error) throwFriendly("Não foi possível registrar o peso.");
  return {
    weightLog: mapWeightLogRow(data!.weight_log_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}

export async function getActiveWeightGoal(
  supabase: SupabaseClient,
): Promise<WeightGoal | null> {
  const { data, error } = await supabase
    .from("weight_goals")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<WeightGoalRow>();

  if (error) throwFriendly("Não foi possível carregar a meta de peso.");
  return data ? mapWeightGoalRow(data) : null;
}

export async function setWeightGoal(
  supabase: SupabaseClient,
  input: SetWeightGoalInput,
): Promise<WeightGoal> {
  const { data, error } = await supabase
    .rpc("set_weight_goal", {
      p_target_weight_kg: input.targetWeightKg,
      p_target_date: input.targetDate || null,
    })
    .single<WeightGoalRow>();

  if (error) throwFriendly("Não foi possível salvar a meta de peso.");
  return mapWeightGoalRow(data!);
}
