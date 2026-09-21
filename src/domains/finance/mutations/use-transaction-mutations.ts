"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateTransactionInput } from "../schemas/transaction-schema";
import {
  cancelTransaction,
  createTransaction,
} from "../services/transaction-service";

function useInvalidateAfterTransactionChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeTransactions });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeAccounts });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeDashboard });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeBudgets });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateAfterTransactionChange();
  return useMutation({
    mutationFn: ({
      input,
      clientRequestId,
    }: {
      input: CreateTransactionInput;
      clientRequestId: string;
    }) => createTransaction(createClient(), input, clientRequestId),
    onSuccess: invalidate,
  });
}

export function useCancelTransaction() {
  const invalidate = useInvalidateAfterTransactionChange();
  return useMutation({
    mutationFn: (transactionId: string) =>
      cancelTransaction(createClient(), transactionId),
    onSuccess: invalidate,
  });
}
