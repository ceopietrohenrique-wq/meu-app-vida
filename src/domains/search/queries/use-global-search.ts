"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { searchGlobal } from "../services/global-search-service";

export function useGlobalSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: [...QUERY_KEYS.globalSearch, trimmed],
    queryFn: () => searchGlobal(createClient(), trimmed),
    enabled: trimmed.length >= 2,
  });
}
