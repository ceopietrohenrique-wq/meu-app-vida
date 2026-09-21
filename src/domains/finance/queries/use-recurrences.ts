"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listRecurrences } from "../services/recurrence-service";

export function useRecurrences() {
  return useQuery({
    queryKey: QUERY_KEYS.financeRecurrences,
    queryFn: () => listRecurrences(createClient()),
  });
}
