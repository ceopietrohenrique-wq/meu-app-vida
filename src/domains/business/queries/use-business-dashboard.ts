"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getBusinessDashboardSummary } from "../services/dashboard-service";

export function useBusinessDashboard(
  periodStart: string,
  periodEnd: string,
  businessId: string | null,
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.businessDashboard,
      periodStart,
      periodEnd,
      businessId,
    ],
    queryFn: () =>
      getBusinessDashboardSummary(
        createClient(),
        periodStart,
        periodEnd,
        businessId,
      ),
  });
}
