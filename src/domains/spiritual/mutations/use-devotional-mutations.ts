"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { LogDevotionalInput } from "../schemas/devotional-schema";
import { logDevotional } from "../services/devotional-service";

export function useLogDevotional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogDevotionalInput) =>
      logDevotional(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.devotionals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.spiritualXpSummary,
      });
    },
  });
}
