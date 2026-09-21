"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  listTransactions,
  type ListTransactionsFilters,
} from "../services/transaction-service";

export function useTransactions(filters: ListTransactionsFilters) {
  return useQuery({
    queryKey: [...QUERY_KEYS.financeTransactions, filters],
    queryFn: () => listTransactions(createClient(), filters),
  });
}
