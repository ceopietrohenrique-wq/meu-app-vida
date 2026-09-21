"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  getWaterSettings,
  listWaterLogsForDate,
} from "../services/water-service";

export function useWaterToday(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.waterToday, today],
    queryFn: async () => {
      const supabase = createClient();
      const [settings, logs] = await Promise.all([
        getWaterSettings(supabase),
        listWaterLogsForDate(supabase, today),
      ]);
      const totalMl = logs.reduce((sum, log) => sum + log.amountMl, 0);
      return { settings, logs, totalMl };
    },
  });
}
