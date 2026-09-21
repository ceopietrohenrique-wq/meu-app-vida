export type SpiritualXpSummary = {
  weekStartDate: string;
  weeklySpiritualXp: number;
};

export type SpiritualXpSummaryRow = {
  week_start_date: string;
  weekly_spiritual_xp: number;
};

export function mapSpiritualXpSummaryRow(
  row: SpiritualXpSummaryRow,
): SpiritualXpSummary {
  return {
    weekStartDate: row.week_start_date,
    weeklySpiritualXp: row.weekly_spiritual_xp,
  };
}
