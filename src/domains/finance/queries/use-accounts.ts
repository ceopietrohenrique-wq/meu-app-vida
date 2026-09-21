"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listAccountsWithBalance } from "../services/account-service";

export function useAccounts() {
  return useQuery({
    queryKey: QUERY_KEYS.financeAccounts,
    queryFn: () => listAccountsWithBalance(createClient()),
  });
}
