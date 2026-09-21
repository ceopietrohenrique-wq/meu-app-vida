"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateReadingPlanInput } from "../schemas/reading-plan-schema";
import {
  completeReadingDay,
  createReadingPlan,
} from "../services/reading-plan-service";

function useInvalidateAfterReadingChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.readingPlans });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spiritualXpSummary });
  };
}

export function useCreateReadingPlan() {
  const invalidate = useInvalidateAfterReadingChange();
  return useMutation({
    mutationFn: (input: CreateReadingPlanInput) =>
      createReadingPlan(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useCompleteReadingDay() {
  const invalidate = useInvalidateAfterReadingChange();
  return useMutation({
    mutationFn: ({
      readingPlanId,
      dayNumber,
      date,
      notes,
    }: {
      readingPlanId: string;
      dayNumber: number;
      date: string;
      notes?: string;
    }) =>
      completeReadingDay(createClient(), readingPlanId, dayNumber, date, notes),
    onSuccess: invalidate,
  });
}
