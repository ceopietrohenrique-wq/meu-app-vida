import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateReadingPlanInput } from "../schemas/reading-plan-schema";
import {
  mapReadingPlanLogRow,
  mapReadingPlanRow,
  type ReadingPlan,
  type ReadingPlanLog,
  type ReadingPlanLogRow,
  type ReadingPlanRow,
} from "../types/reading-plan";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listActiveReadingPlans(
  supabase: SupabaseClient,
): Promise<ReadingPlan[]> {
  const { data, error } = await supabase
    .from("reading_plans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<ReadingPlanRow[]>();

  if (error) throwFriendly("Não foi possível carregar os planos de leitura.");
  return (data ?? []).map(mapReadingPlanRow);
}

export async function createReadingPlan(
  supabase: SupabaseClient,
  input: CreateReadingPlanInput,
): Promise<ReadingPlan> {
  const { data, error } = await supabase
    .from("reading_plans")
    .insert({
      name: input.name,
      start_date: input.startDate,
      total_days: input.totalDays,
    })
    .select("*")
    .single<ReadingPlanRow>();

  if (error) throwFriendly("Não foi possível criar o plano de leitura.");
  return mapReadingPlanRow(data!);
}

export async function listReadingPlanLogs(
  supabase: SupabaseClient,
  readingPlanId: string,
): Promise<ReadingPlanLog[]> {
  const { data, error } = await supabase
    .from("reading_plan_logs")
    .select("*")
    .eq("reading_plan_id", readingPlanId)
    .returns<ReadingPlanLogRow[]>();

  if (error) throwFriendly("Não foi possível carregar o progresso do plano.");
  return (data ?? []).map(mapReadingPlanLogRow);
}

type CompleteReadingDayRpcResult = {
  reading_plan_log_row: ReadingPlanLogRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function completeReadingDay(
  supabase: SupabaseClient,
  readingPlanId: string,
  dayNumber: number,
  date: string,
  notes?: string,
): Promise<{ log: ReadingPlanLog; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("complete_reading_day", {
      p_reading_plan_id: readingPlanId,
      p_day_number: dayNumber,
      p_date: date,
      p_notes: notes ?? null,
    })
    .single<CompleteReadingDayRpcResult>();

  if (error) throwFriendly("Não foi possível concluir o dia de leitura.");
  return {
    log: mapReadingPlanLogRow(data!.reading_plan_log_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}
