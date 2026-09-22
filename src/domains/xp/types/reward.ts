export type Reward = {
  id: string;
  name: string;
  description: string | null;
  xpCost: number;
  isActive: boolean;
  createdAt: string;
};

export type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  xp_cost: number;
  is_active: boolean;
  created_at: string;
};

export function mapRewardRow(row: RewardRow): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    xpCost: row.xp_cost,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export type RewardRedemption = {
  id: string;
  rewardId: string;
  xpTotalAtRedemption: number;
  xpCostAtRedemption: number;
  notes: string | null;
  redeemedAt: string;
};

export type RewardRedemptionRow = {
  id: string;
  reward_id: string;
  xp_total_at_redemption: number;
  xp_cost_at_redemption: number;
  notes: string | null;
  redeemed_at: string;
};

export function mapRewardRedemptionRow(
  row: RewardRedemptionRow,
): RewardRedemption {
  return {
    id: row.id,
    rewardId: row.reward_id,
    xpTotalAtRedemption: row.xp_total_at_redemption,
    xpCostAtRedemption: row.xp_cost_at_redemption,
    notes: row.notes,
    redeemedAt: row.redeemed_at,
  };
}
