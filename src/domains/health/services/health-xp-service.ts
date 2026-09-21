import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapHealthXpSummaryRow,
  type HealthXpSummary,
  type HealthXpSummaryRow,
} from "../types/health-xp-summary";

export async function getHealthXpSummary(
  supabase: SupabaseClient,
): Promise<HealthXpSummary> {
  const { data, error } = await supabase
    .rpc("get_health_xp_summary")
    .single<HealthXpSummaryRow>();

  if (error) {
    throw new Error("Não foi possível carregar o resumo de XP de saúde.");
  }
  return mapHealthXpSummaryRow(data!);
}
