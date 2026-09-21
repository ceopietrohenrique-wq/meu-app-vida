"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { saveDailyReview } from "../services/daily-review-service";
import type { DailyReviewSnapshot } from "../types/daily-review";

export function useSaveDailyReview(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      snapshot,
      carryOverNote,
    }: {
      snapshot: DailyReviewSnapshot;
      carryOverNote: string | null;
    }) => saveDailyReview(createClient(), date, snapshot, carryOverNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyReview });
    },
  });
}
