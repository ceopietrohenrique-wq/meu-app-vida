"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listPrayers } from "../services/prayer-service";

export function usePrayers() {
  return useQuery({
    queryKey: QUERY_KEYS.prayers,
    queryFn: () => listPrayers(createClient()),
  });
}
