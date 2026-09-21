import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapXpSummaryRow,
  type XpSummary,
  type XpSummaryRow,
} from "../types/xp-summary";

export async function getWeeklyXpSummary(
  supabase: SupabaseClient,
): Promise<XpSummary> {
  const { data, error } = await supabase
    .rpc("get_weekly_xp_summary")
    .single<XpSummaryRow>();

  if (error) {
    throw new Error("Não foi possível carregar o resumo de XP.");
  }
  return mapXpSummaryRow(data!);
}
