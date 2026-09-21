import type { SupabaseClient } from "@supabase/supabase-js";

import type { FinanceContext } from "../types/account";
import {
  type DashboardSummary,
  type DashboardSummaryRow,
  mapDashboardSummaryRow,
} from "../types/dashboard-summary";

function throwFriendly(message: string): never {
  throw new Error(message);
}

/**
 * `context` aqui aceita também `"consolidado"`, que soma pessoal +
 * empresarial — só quando o usuário escolhe essa visão explicitamente
 * (CLAUDE.md > Fase 4 > 4, nunca é o padrão).
 */
export async function getFinanceDashboardSummary(
  supabase: SupabaseClient,
  context: FinanceContext | "consolidado",
  periodStart: string,
  periodEnd: string,
): Promise<DashboardSummary> {
  const { data, error } = await supabase
    .rpc("get_finance_dashboard_summary", {
      p_context: context,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    })
    .single<DashboardSummaryRow>();

  if (error) throwFriendly("Não foi possível carregar o dashboard financeiro.");
  return mapDashboardSummaryRow(data!);
}
