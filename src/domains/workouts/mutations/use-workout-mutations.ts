"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateWorkoutPlanInput } from "../schemas/workout-schema";
import {
  completeWorkoutSession,
  createWorkoutPlan,
  logExerciseSet,
  startWorkoutSession,
} from "../services/workouts-service";

export function useCreateWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutPlanInput) =>
      createWorkoutPlan(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workoutPlans });
    },
  });
}

export function useStartWorkoutSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workoutPlanId,
      date,
    }: {
      workoutPlanId: string | null;
      date: string;
    }) => startWorkoutSession(createClient(), workoutPlanId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workoutSessions });
    },
  });
}

export function useLogExerciseSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      workoutSessionId: string;
      workoutExerciseId: string;
      setOrder: number;
      loadKg: number | null;
      reps: number | null;
    }) => logExerciseSet(createClient(), params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_KEYS.workoutSessions,
          variables.workoutSessionId,
          "sets",
        ],
      });
    },
  });
}

export function useCompleteWorkoutSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutSessionId: string) =>
      completeWorkoutSession(createClient(), workoutSessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workoutSessions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.healthXpSummary });
    },
  });
}
