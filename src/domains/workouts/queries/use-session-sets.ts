"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listSetsForSession } from "../services/workouts-service";

export function useSessionSets(workoutSessionId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.workoutSessions, workoutSessionId, "sets"],
    queryFn: () => listSetsForSession(createClient(), workoutSessionId!),
    enabled: !!workoutSessionId,
  });
}
