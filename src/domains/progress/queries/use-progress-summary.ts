"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getProgressSummary } from "../services/progress-service";

export function useProgressSummary(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.progressSummary, periodStart, periodEnd],
    queryFn: () => getProgressSummary(createClient(), periodStart, periodEnd),
  });
}
