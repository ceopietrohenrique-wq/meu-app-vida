import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type BusinessDashboardSummary,
  type BusinessDashboardSummaryRow,
  mapBusinessDashboardSummaryRow,
} from "../types/dashboard-summary";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function getBusinessDashboardSummary(
  supabase: SupabaseClient,
  periodStart: string,
  periodEnd: string,
  businessId: string | null,
): Promise<BusinessDashboardSummary> {
  const { data, error } = await supabase
    .rpc("get_business_dashboard_summary", {
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_business_id: businessId,
    })
    .single<BusinessDashboardSummaryRow>();

  if (error)
    throwFriendly("Não foi possível carregar o dashboard empresarial.");
  return mapBusinessDashboardSummaryRow(data!);
}
