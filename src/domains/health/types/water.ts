export type WaterSettings = {
  dailyGoalMl: number;
};

export type WaterSettingsRow = {
  user_id: string;
  daily_goal_ml: number;
  updated_at: string;
};

export function mapWaterSettingsRow(row: WaterSettingsRow): WaterSettings {
  return { dailyGoalMl: row.daily_goal_ml };
}

export type WaterLog = {
  id: string;
  date: string;
  amountMl: number;
  createdAt: string;
};

export type WaterLogRow = {
  id: string;
  date: string;
  amount_ml: number;
  created_at: string;
};

export function mapWaterLogRow(row: WaterLogRow): WaterLog {
  return {
    id: row.id,
    date: row.date,
    amountMl: row.amount_ml,
    createdAt: row.created_at,
  };
}

export type LogWaterResult = {
  waterLog: WaterLog;
  totalMl: number;
  goalMl: number;
  goalReached: boolean;
  xpAwarded: boolean;
  xpAmount: number;
};

export type LogWaterRpcResult = {
  water_log_row: WaterLogRow;
  total_ml: number;
  goal_ml: number;
  goal_reached: boolean;
  xp_awarded: boolean;
  xp_amount: number;
};

export function mapLogWaterRpcResult(row: LogWaterRpcResult): LogWaterResult {
  return {
    waterLog: mapWaterLogRow(row.water_log_row),
    totalMl: row.total_ml,
    goalMl: row.goal_ml,
    goalReached: row.goal_reached,
    xpAwarded: row.xp_awarded,
    xpAmount: row.xp_amount,
  };
}
