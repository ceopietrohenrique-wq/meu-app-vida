"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  listActiveReadingPlans,
  listReadingPlanLogs,
} from "../services/reading-plan-service";
import type { ReadingPlan } from "../types/reading-plan";
import { computeReadingPlanProgress } from "../utils/reading-plan-progress";
import type { ReadingPlanProgress } from "../utils/reading-plan-progress";

export type ReadingPlanWithProgress = ReadingPlan & {
  progress: ReadingPlanProgress;
  completedDayNumbers: Set<number>;
};

export function useReadingPlansWithProgress(today: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.readingPlans, "with-progress", today],
    queryFn: async (): Promise<ReadingPlanWithProgress[]> => {
      const supabase = createClient();
      const plans = await listActiveReadingPlans(supabase);

      return Promise.all(
        plans.map(async (plan) => {
          const logs = await listReadingPlanLogs(supabase, plan.id);
          return {
            ...plan,
            progress: computeReadingPlanProgress(
              plan.startDate,
              plan.totalDays,
              logs.map((l) => ({ dayNumber: l.dayNumber, date: l.date })),
              today,
            ),
            completedDayNumbers: new Set(logs.map((l) => l.dayNumber)),
          };
        }),
      );
    },
  });
}
