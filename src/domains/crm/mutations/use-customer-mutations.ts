"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type {
  CreateCustomerInput,
  SetFollowUpInput,
  UpdateStageInput,
} from "../schemas/customer-schema";
import {
  createCustomer,
  setCustomerFollowUp,
  updateCustomerStage,
} from "../services/customer-service";

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      createCustomer(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomerStage() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: UpdateStageInput) =>
      updateCustomerStage(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useSetCustomerFollowUp() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: SetFollowUpInput) =>
      setCustomerFollowUp(createClient(), input),
    onSuccess: invalidate,
  });
}
