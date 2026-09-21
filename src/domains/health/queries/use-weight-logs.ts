"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listWeightLogsSince } from "../services/weight-service";

// Janela suficiente para calcular tendência (média móvel) com folga.
const HISTORY_WINDOW_DAYS = 90;

export function useWeightLogs(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weightLogs, today],
    queryFn: async () => {
      const sinceDate = format(
        subDays(new Date(today), HISTORY_WINDOW_DAYS),
        "yyyy-MM-dd",
      );
      return listWeightLogsSince(createClient(), sinceDate);
    },
  });
}
