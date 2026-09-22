"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listQuarterlyGoals } from "../services/goal-service";

export function useQuarterlyGoals() {
  return useQuery({
    queryKey: QUERY_KEYS.quarterlyGoals,
    queryFn: () => listQuarterlyGoals(createClient()),
  });
}
