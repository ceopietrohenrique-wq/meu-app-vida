"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateAccountInput } from "../schemas/account-schema";
import { createAccount, setAccountActive } from "../services/account-service";

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      createAccount(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeAccounts });
    },
  });
}

export function useSetAccountActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      isActive,
    }: {
      accountId: string;
      isActive: boolean;
    }) => setAccountActive(createClient(), accountId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeAccounts });
    },
  });
}
