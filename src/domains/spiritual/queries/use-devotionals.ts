"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listDevotionalsSince } from "../services/devotional-service";

// Janela suficiente para calcular streak com folga (mesmo critério da
// Fase 2 para peso/água).
const HISTORY_WINDOW_DAYS = 90;

export function useDevotionals(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.devotionals, today],
    queryFn: () => {
      const sinceDate = format(
        subDays(new Date(today), HISTORY_WINDOW_DAYS),
        "yyyy-MM-dd",
      );
      return listDevotionalsSince(createClient(), sinceDate);
    },
  });
}
