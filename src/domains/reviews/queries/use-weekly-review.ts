"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  getWeeklyReview,
  getWeeklyReviewSnapshot,
} from "../services/weekly-review-service";

export function useWeeklyReviewData(weekStart: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weeklyReview, weekStart],
    queryFn: async () => {
      const supabase = createClient();
      const [snapshot, savedReview] = await Promise.all([
        getWeeklyReviewSnapshot(supabase, weekStart),
        getWeeklyReview(supabase, weekStart),
      ]);
      return { snapshot, savedReview };
    },
  });
}
