"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { WeeklyReviewAnswersInput } from "../schemas/weekly-review-schema";
import { saveWeeklyReview } from "../services/weekly-review-service";
import type { WeeklyReviewSnapshot } from "../types/weekly-review";

export function useSaveWeeklyReview(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      snapshot,
      answers,
    }: {
      snapshot: WeeklyReviewSnapshot;
      answers: WeeklyReviewAnswersInput;
    }) => saveWeeklyReview(createClient(), weekStart, snapshot, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weeklyReview });
    },
  });
}
