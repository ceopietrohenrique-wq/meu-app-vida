"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listRewardRedemptions, listRewards } from "../services/reward-service";

export function useRewards() {
  return useQuery({
    queryKey: QUERY_KEYS.rewards,
    queryFn: () => listRewards(createClient()),
  });
}

export function useRewardRedemptions() {
  return useQuery({
    queryKey: QUERY_KEYS.rewardRedemptions,
    queryFn: () => listRewardRedemptions(createClient()),
  });
}
