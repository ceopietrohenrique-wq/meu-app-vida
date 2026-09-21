"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { SetWaterGoalInput } from "../schemas/water-schema";
import { logWater, setWaterGoal } from "../services/water-service";

function useInvalidateAfterWaterChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.waterToday });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.healthXpSummary });
  };
}

export function useLogWater() {
  const invalidate = useInvalidateAfterWaterChange();
  return useMutation({
    mutationFn: ({ amountMl, date }: { amountMl: number; date: string }) =>
      logWater(createClient(), amountMl, date),
    onSuccess: invalidate,
  });
}

export function useSetWaterGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetWaterGoalInput) =>
      setWaterGoal(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.waterToday });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.waterSettings });
    },
  });
}
