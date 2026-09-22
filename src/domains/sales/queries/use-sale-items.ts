"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listSaleItems } from "../services/sale-service";

export function useSaleItems(saleId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sales, saleId, "items"],
    queryFn: () => listSaleItems(createClient(), saleId),
    enabled: Boolean(saleId),
  });
}
