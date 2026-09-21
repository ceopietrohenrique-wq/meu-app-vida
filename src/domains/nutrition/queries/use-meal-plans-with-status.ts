"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  listActiveMealPlans,
  listMealLogsSince,
} from "../services/meal-service";
import type { MealLogStatus, MealPlan } from "../types/meal";

export type MealPlanWithStatus = MealPlan & {
  statusToday: MealLogStatus | null;
};

export function useMealPlansWithStatus(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.mealPlans, "with-status", today],
    queryFn: async (): Promise<MealPlanWithStatus[]> => {
      const supabase = createClient();
      const [plans, logs] = await Promise.all([
        listActiveMealPlans(supabase),
        listMealLogsSince(supabase, today),
      ]);
      const statusByPlan = new Map(
        logs
          .filter((log) => log.date === today)
          .map((log) => [log.mealPlanId, log.status]),
      );
      return plans.map((plan) => ({
        ...plan,
        statusToday: statusByPlan.get(plan.id) ?? null,
      }));
    },
  });
}
