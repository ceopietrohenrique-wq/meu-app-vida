"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateHabitInput } from "../schemas/habit-schema";
import {
  completeHabit,
  createHabit,
  uncompleteHabit,
} from "../services/habits-service";

function useInvalidateAfterHabitChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.habits });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
  };
}

export function useCreateHabit() {
  const invalidate = useInvalidateAfterHabitChange();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => createHabit(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useCompleteHabit() {
  const invalidate = useInvalidateAfterHabitChange();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      completeHabit(createClient(), habitId, date),
    onSuccess: invalidate,
  });
}

export function useUncompleteHabit() {
  const invalidate = useInvalidateAfterHabitChange();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      uncompleteHabit(createClient(), habitId, date),
    onSuccess: invalidate,
  });
}
