"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getXpTrend } from "../services/progress-service";

export function useXpTrend(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.xpTrend, periodStart, periodEnd],
    queryFn: () => getXpTrend(createClient(), periodStart, periodEnd),
  });
}
