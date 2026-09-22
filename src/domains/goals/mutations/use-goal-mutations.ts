"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateQuarterlyGoalInput } from "../schemas/goal-schema";
import {
  createQuarterlyGoal,
  setGoalCompleted,
  updateGoalProgress,
} from "../services/goal-service";

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quarterlyGoals });
}

export function useCreateQuarterlyGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (input: CreateQuarterlyGoalInput) =>
      createQuarterlyGoal(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useUpdateGoalProgress() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({
      goalId,
      currentValue,
    }: {
      goalId: string;
      currentValue?: number;
    }) => updateGoalProgress(createClient(), goalId, currentValue),
    onSuccess: invalidate,
  });
}

export function useSetGoalCompleted() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({
      goalId,
      isCompleted,
    }: {
      goalId: string;
      isCompleted: boolean;
    }) => setGoalCompleted(createClient(), goalId, isCompleted),
    onSuccess: () => {
      invalidate();
      // Concluir uma meta trimestral é uma das condições de conquista —
      // reavalia na hora em vez de esperar a próxima visita a Progresso.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.achievements });
    },
  });
}
