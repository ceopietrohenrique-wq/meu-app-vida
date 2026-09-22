import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateRewardInput } from "../schemas/reward-schema";
import {
  mapRewardRedemptionRow,
  mapRewardRow,
  type Reward,
  type RewardRedemption,
  type RewardRedemptionRow,
  type RewardRow,
} from "../types/reward";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listRewards(supabase: SupabaseClient): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("is_active", true)
    .order("xp_cost")
    .returns<RewardRow[]>();

  if (error) throwFriendly("Não foi possível carregar as recompensas.");
  return (data ?? []).map(mapRewardRow);
}

export async function createReward(
  supabase: SupabaseClient,
  input: CreateRewardInput,
): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .insert({
      name: input.name,
      description: input.description || null,
      xp_cost: input.xpCost,
    })
    .select("*")
    .single<RewardRow>();

  if (error) throwFriendly("Não foi possível criar a recompensa.");
  return mapRewardRow(data!);
}

export async function listRewardRedemptions(
  supabase: SupabaseClient,
): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("*")
    .order("redeemed_at", { ascending: false })
    .returns<RewardRedemptionRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico de resgates.");
  return (data ?? []).map(mapRewardRedemptionRow);
}

export async function redeemReward(
  supabase: SupabaseClient,
  rewardId: string,
  clientRequestId: string,
): Promise<RewardRedemption> {
  const { data, error } = await supabase
    .rpc("redeem_reward", {
      p_reward_id: rewardId,
      p_client_request_id: clientRequestId,
    })
    .single<RewardRedemptionRow>();

  if (error) {
    if (error.message.includes("XP insuficiente")) {
      throwFriendly("XP insuficiente para resgatar esta recompensa.");
    }
    throwFriendly("Não foi possível resgatar a recompensa.");
  }
  return mapRewardRedemptionRow(data!);
}
