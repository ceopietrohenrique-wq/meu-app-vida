"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { LogInteractionInput } from "../schemas/interaction-schema";
import { logInteraction } from "../services/interaction-service";

export function useLogInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogInteractionInput) =>
      logInteraction(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customerInteractions,
      });
    },
  });
}
