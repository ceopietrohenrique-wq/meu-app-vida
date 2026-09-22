"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listCatalogItems } from "../services/catalog-service";

export function useCatalogItems(businessId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.catalogItems, businessId ?? "all"],
    queryFn: () => listCatalogItems(createClient(), businessId),
  });
}
