"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateMealPlanInput } from "../schemas/meal-schema";
import { createMealPlan, setMealLogStatus } from "../services/meal-service";
import type { MealLogStatus } from "../types/meal";

function useInvalidateAfterMealChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mealPlans });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.healthXpSummary });
  };
}

export function useCreateMealPlan() {
  const invalidate = useInvalidateAfterMealChange();
  return useMutation({
    mutationFn: (input: CreateMealPlanInput) =>
      createMealPlan(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useSetMealLogStatus() {
  const invalidate = useInvalidateAfterMealChange();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      date,
      status,
    }: {
      mealPlanId: string;
      date: string;
      status: MealLogStatus;
    }) => setMealLogStatus(createClient(), mealPlanId, date, status),
    onSuccess: invalidate,
  });
}
