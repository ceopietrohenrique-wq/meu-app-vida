"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listSavedVerses } from "../services/saved-verse-service";

export function useSavedVerses() {
  return useQuery({
    queryKey: QUERY_KEYS.savedVerses,
    queryFn: () => listSavedVerses(createClient()),
  });
}
