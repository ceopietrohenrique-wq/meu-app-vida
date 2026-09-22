export type ProgressSummary = {
  xpTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitLogsCount: number;
  workoutsCompleted: number;
  mealsAdherent: number;
  mealsPlanned: number;
  waterGoalDays: number;
  devotionalDays: number;
  bibleReadingDays: number;
  weightLogsCount: number;
  firstWeightKg: number | null;
  latestWeightKg: number | null;
};

export type ProgressSummaryRow = {
  xp_total: number;
  tasks_completed: number;
  tasks_total: number;
  habit_logs_count: number;
  workouts_completed: number;
  meals_adherent: number;
  meals_planned: number;
  water_goal_days: number;
  devotional_days: number;
  bible_reading_days: number;
  weight_logs_count: number;
  first_weight_kg: number | null;
  latest_weight_kg: number | null;
};

export function mapProgressSummaryRow(
  row: ProgressSummaryRow,
): ProgressSummary {
  return {
    xpTotal: row.xp_total,
    tasksCompleted: row.tasks_completed,
    tasksTotal: row.tasks_total,
    habitLogsCount: row.habit_logs_count,
    workoutsCompleted: row.workouts_completed,
    mealsAdherent: row.meals_adherent,
    mealsPlanned: row.meals_planned,
    waterGoalDays: row.water_goal_days,
    devotionalDays: row.devotional_days,
    bibleReadingDays: row.bible_reading_days,
    weightLogsCount: row.weight_logs_count,
    firstWeightKg: row.first_weight_kg,
    latestWeightKg: row.latest_weight_kg,
  };
}

export type XpTrendPoint = { date: string; xpAmount: number };

export type XpTrendRow = { day: string; xp_amount: number };

export function mapXpTrendRow(row: XpTrendRow): XpTrendPoint {
  return { date: row.day, xpAmount: row.xp_amount };
}
