"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { SpiritualSearchInput } from "../schemas/search-schema";
import { searchSpiritual } from "../services/search-service";

export function useSpiritualSearch(filters: SpiritualSearchInput) {
  return useQuery({
    queryKey: [...QUERY_KEYS.spiritualSearch, filters],
    queryFn: () => searchSpiritual(createClient(), filters),
  });
}
