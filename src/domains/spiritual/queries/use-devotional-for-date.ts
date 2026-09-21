"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getDevotionalForDate } from "../services/devotional-service";

export function useDevotionalForDate(date: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.devotionals, "date", date],
    queryFn: () => getDevotionalForDate(createClient(), date),
  });
}
