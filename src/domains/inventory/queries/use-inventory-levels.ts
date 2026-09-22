"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listInventoryLevels } from "../services/inventory-service";

export function useInventoryLevels() {
  return useQuery({
    queryKey: QUERY_KEYS.inventoryLevels,
    queryFn: () => listInventoryLevels(createClient()),
  });
}
