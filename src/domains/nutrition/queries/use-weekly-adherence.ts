"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  listActiveMealPlans,
  listMealLogsSince,
} from "../services/meal-service";
import {
  buildWeekAdherenceStrip,
  computeDaysWithAtLeastOneMealCompleted,
  computeMealAdherenceRate,
} from "../utils/adherence";

const WEEK_DAYS = 7;

export function useWeeklyAdherence(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.mealPlans, "weekly-adherence", today],
    queryFn: async () => {
      const supabase = createClient();
      const sinceDate = format(
        subDays(new Date(today), WEEK_DAYS - 1),
        "yyyy-MM-dd",
      );
      const [plans, logs] = await Promise.all([
        listActiveMealPlans(supabase),
        listMealLogsSince(supabase, sinceDate),
      ]);
      const adherenceRate = computeMealAdherenceRate(
        logs,
        plans.length,
        WEEK_DAYS,
      );
      const daysWithMeal = computeDaysWithAtLeastOneMealCompleted(logs);
      const strip = buildWeekAdherenceStrip(logs, sinceDate, today);
      return { adherenceRate, daysWithMeal, totalDays: WEEK_DAYS, strip };
    },
  });
}
