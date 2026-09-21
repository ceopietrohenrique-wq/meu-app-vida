"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getFinanceDashboardSummary } from "../services/dashboard-service";
import type { FinanceContext } from "../types/account";

export function useFinanceDashboard(
  context: FinanceContext | "consolidado",
  periodStart: string,
  periodEnd: string,
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.financeDashboard, context, periodStart, periodEnd],
    queryFn: () =>
      getFinanceDashboardSummary(
        createClient(),
        context,
        periodStart,
        periodEnd,
      ),
  });
}
