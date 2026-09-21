"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listWorkoutExercisesForPlan } from "../services/workouts-service";

export function useWorkoutExercises(workoutPlanId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.workoutPlans, workoutPlanId, "exercises"],
    queryFn: () => listWorkoutExercisesForPlan(createClient(), workoutPlanId!),
    enabled: !!workoutPlanId,
  });
}
