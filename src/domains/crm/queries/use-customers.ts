"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listCustomers } from "../services/customer-service";

export function useCustomers(businessId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.customers, businessId ?? "all"],
    queryFn: () => listCustomers(createClient(), businessId),
  });
}
