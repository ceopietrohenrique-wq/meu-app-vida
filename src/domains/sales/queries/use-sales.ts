"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listSales } from "../services/sale-service";

export function useSales(filters: {
  periodStart: string;
  periodEnd: string;
  businessId?: string;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sales, filters],
    queryFn: () => listSales(createClient(), filters),
  });
}
