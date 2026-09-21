export type XpSummary = {
  weekStartDate: string;
  weeklyXp: number;
  weeklyGoal: number;
  totalXp: number;
};

export type XpSummaryRow = {
  week_start_date: string;
  weekly_xp: number;
  weekly_goal: number;
  total_xp: number;
};

export function mapXpSummaryRow(row: XpSummaryRow): XpSummary {
  return {
    weekStartDate: row.week_start_date,
    weeklyXp: row.weekly_xp,
    weeklyGoal: row.weekly_goal,
    totalXp: row.total_xp,
  };
}
