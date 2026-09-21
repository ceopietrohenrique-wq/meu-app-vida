"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type {
  CreatePrayerInput,
  MarkPrayerAnsweredInput,
} from "../schemas/prayer-schema";
import { createPrayer, markPrayerAsAnswered } from "../services/prayer-service";

export function useCreatePrayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePrayerInput) =>
      createPrayer(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.prayers });
    },
  });
}

export function useMarkPrayerAsAnswered() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: MarkPrayerAnsweredInput;
    }) => markPrayerAsAnswered(createClient(), id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.prayers });
    },
  });
}
