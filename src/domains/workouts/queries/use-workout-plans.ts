"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listActiveWorkoutPlans } from "../services/workouts-service";

export function useWorkoutPlans() {
  return useQuery({
    queryKey: QUERY_KEYS.workoutPlans,
    queryFn: () => listActiveWorkoutPlans(createClient()),
  });
}
