"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listRecentSessions } from "../services/workouts-service";

export function useRecentSessions() {
  return useQuery({
    queryKey: [...QUERY_KEYS.workoutSessions, "recent"],
    queryFn: () => listRecentSessions(createClient()),
  });
}
