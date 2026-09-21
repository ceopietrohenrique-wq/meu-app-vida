"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getSpiritualXpSummary } from "../services/spiritual-xp-service";

export function useSpiritualXpSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.spiritualXpSummary,
    queryFn: () => getSpiritualXpSummary(createClient()),
  });
}
