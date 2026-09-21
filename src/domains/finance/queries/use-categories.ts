"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listCategories } from "../services/category-service";
import type { FinanceContext } from "../types/account";

export function useCategories(context?: FinanceContext) {
  return useQuery({
    queryKey: [...QUERY_KEYS.financeCategories, context ?? "all"],
    queryFn: () => listCategories(createClient(), context),
  });
}
