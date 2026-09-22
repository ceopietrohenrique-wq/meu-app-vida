"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateSaleInput } from "../schemas/sale-schema";
import { createSale, updateSaleStatus } from "../services/sale-service";

function useInvalidateAfterSaleChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sales });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryLevels });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessDashboard });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeAccounts });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeTransactions });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeDashboard });
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateAfterSaleChange();
  return useMutation({
    mutationFn: ({
      input,
      clientRequestId,
    }: {
      input: CreateSaleInput;
      clientRequestId: string;
    }) => createSale(createClient(), input, clientRequestId),
    onSuccess: invalidate,
  });
}

export function useUpdateSaleStatus() {
  const invalidate = useInvalidateAfterSaleChange();
  return useMutation({
    mutationFn: ({
      saleId,
      newStatus,
      clientRequestId,
    }: {
      saleId: string;
      newStatus: string;
      clientRequestId: string;
    }) => updateSaleStatus(createClient(), saleId, newStatus, clientRequestId),
    onSuccess: invalidate,
  });
}
