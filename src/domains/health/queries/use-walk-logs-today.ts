"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listWalkLogsForDate } from "../services/walk-service";

export function useWalkLogsToday(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.walkLogs, today],
    queryFn: () => listWalkLogsForDate(createClient(), today),
  });
}
