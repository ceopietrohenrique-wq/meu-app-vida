"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listCustomerInteractions } from "../services/interaction-service";

export function useCustomerInteractions(customerId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.customerInteractions, customerId],
    queryFn: () => listCustomerInteractions(createClient(), customerId),
    enabled: Boolean(customerId),
  });
}
