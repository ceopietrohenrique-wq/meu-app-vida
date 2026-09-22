"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateRewardInput } from "../schemas/reward-schema";
import { createReward, redeemReward } from "../services/reward-service";

export function useCreateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRewardInput) =>
      createReward(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rewards });
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rewardId,
      clientRequestId,
    }: {
      rewardId: string;
      clientRequestId: string;
    }) => redeemReward(createClient(), rewardId, clientRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rewardRedemptions });
    },
  });
}
