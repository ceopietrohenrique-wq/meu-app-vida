import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapProgressSummaryRow,
  mapXpTrendRow,
  type ProgressSummary,
  type ProgressSummaryRow,
  type XpTrendPoint,
  type XpTrendRow,
} from "../types/progress-summary";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function getProgressSummary(
  supabase: SupabaseClient,
  periodStart: string,
  periodEnd: string,
): Promise<ProgressSummary> {
  const { data, error } = await supabase
    .rpc("get_progress_summary", {
      p_period_start: periodStart,
      p_period_end: periodEnd,
    })
    .single<ProgressSummaryRow>();

  if (error) throwFriendly("Não foi possível carregar o resumo de progresso.");
  return mapProgressSummaryRow(data!);
}

export async function getXpTrend(
  supabase: SupabaseClient,
  periodStart: string,
  periodEnd: string,
): Promise<XpTrendPoint[]> {
  const { data, error } = await supabase.rpc("get_xp_trend", {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) throwFriendly("Não foi possível carregar a tendência de XP.");
  return ((data ?? []) as XpTrendRow[]).map(mapXpTrendRow);
}
