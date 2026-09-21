"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getWeeklyPlan } from "../services/weekly-plan-service";

export function useWeeklyPlan(weekStart: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weeklyPlan, weekStart],
    queryFn: () => getWeeklyPlan(createClient(), weekStart),
  });
}
