"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { LogWalkInput } from "../schemas/walk-schema";
import { logWalk } from "../services/walk-service";

export function useLogWalk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogWalkInput) => logWalk(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walkLogs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.healthXpSummary });
    },
  });
}
