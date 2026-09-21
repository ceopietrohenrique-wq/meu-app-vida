"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listBibleStudyNotes } from "../services/bible-study-service";

export function useBibleStudyNotes() {
  return useQuery({
    queryKey: QUERY_KEYS.bibleStudyNotes,
    queryFn: () => listBibleStudyNotes(createClient()),
  });
}
