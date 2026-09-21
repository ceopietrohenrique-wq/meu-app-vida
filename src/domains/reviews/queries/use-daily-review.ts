"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  getDailyReview,
  getDailyReviewSnapshot,
} from "../services/daily-review-service";

export function useDailyReviewData(date: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.dailyReview, date],
    queryFn: async () => {
      const supabase = createClient();
      const [snapshot, savedReview] = await Promise.all([
        getDailyReviewSnapshot(supabase, date),
        getDailyReview(supabase, date),
      ]);
      return { snapshot, savedReview };
    },
  });
}
