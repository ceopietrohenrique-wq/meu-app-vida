export type HealthXpSummary = {
  weekStartDate: string;
  weeklyHealthXp: number;
};

export type HealthXpSummaryRow = {
  week_start_date: string;
  weekly_health_xp: number;
};

export function mapHealthXpSummaryRow(
  row: HealthXpSummaryRow,
): HealthXpSummary {
  return {
    weekStartDate: row.week_start_date,
    weeklyHealthXp: row.weekly_health_xp,
  };
}
