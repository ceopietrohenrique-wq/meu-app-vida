"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listBudgets } from "../services/budget-service";

export function useBudgets(periodMonth: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.financeBudgets, periodMonth],
    queryFn: () => listBudgets(createClient(), periodMonth),
  });
}
