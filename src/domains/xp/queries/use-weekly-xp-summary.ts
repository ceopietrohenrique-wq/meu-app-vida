"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getWeeklyXpSummary } from "../services/xp-service";

export function useWeeklyXpSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.xpSummary,
    queryFn: () => getWeeklyXpSummary(createClient()),
  });
}
