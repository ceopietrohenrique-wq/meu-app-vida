"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type {
  LogWeightInput,
  SetWeightGoalInput,
} from "../schemas/weight-schema";
import { logWeight, setWeightGoal } from "../services/weight-service";

function useInvalidateAfterWeightChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weightLogs });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.healthXpSummary });
  };
}

export function useLogWeight() {
  const invalidate = useInvalidateAfterWeightChange();
  return useMutation({
    mutationFn: (input: LogWeightInput) => logWeight(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useSetWeightGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetWeightGoalInput) =>
      setWeightGoal(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weightGoal });
    },
  });
}
