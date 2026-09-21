"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getHealthXpSummary } from "../services/health-xp-service";

export function useHealthXpSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.healthXpSummary,
    queryFn: () => getHealthXpSummary(createClient()),
  });
}
