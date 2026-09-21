import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapSpiritualXpSummaryRow,
  type SpiritualXpSummary,
  type SpiritualXpSummaryRow,
} from "../types/spiritual-xp-summary";

export async function getSpiritualXpSummary(
  supabase: SupabaseClient,
): Promise<SpiritualXpSummary> {
  const { data, error } = await supabase
    .rpc("get_spiritual_xp_summary")
    .single<SpiritualXpSummaryRow>();

  if (error) {
    throw new Error("Não foi possível carregar o resumo de XP espiritual.");
  }
  return mapSpiritualXpSummaryRow(data!);
}
