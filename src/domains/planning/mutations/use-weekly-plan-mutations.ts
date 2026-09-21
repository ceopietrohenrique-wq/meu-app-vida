"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { WeeklyPlanInput } from "../schemas/weekly-plan-schema";
import { saveWeeklyPlan } from "../services/weekly-plan-service";

export function useSaveWeeklyPlan(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WeeklyPlanInput) =>
      saveWeeklyPlan(createClient(), weekStart, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weeklyPlan });
    },
  });
}
