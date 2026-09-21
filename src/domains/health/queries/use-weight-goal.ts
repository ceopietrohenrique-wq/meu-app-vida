"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getActiveWeightGoal } from "../services/weight-service";

export function useWeightGoal() {
  return useQuery({
    queryKey: QUERY_KEYS.weightGoal,
    queryFn: () => getActiveWeightGoal(createClient()),
  });
}
