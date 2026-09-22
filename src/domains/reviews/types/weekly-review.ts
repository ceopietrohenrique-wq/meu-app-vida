import { parseMoneyToCents } from "@/shared/lib/money";

export type WeeklyReviewSnapshot = {
  xpEarned: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  workoutsCompleted: number;
  mealsAdherent: number;
  mealsPlanned: number;
  waterGoalDays: number;
  devotionalDays: number;
  bibleReadingDays: number;
  weightLogsCount: number;
  personalExpensesCents: number;
  salesRevenueCents: number;
  salesProfitCents: number;
  leadsCount: number;
};

export type WeeklyReviewSnapshotRow = {
  xp_earned: number;
  tasks_completed: number;
  tasks_total: number;
  habits_completed: number;
  workouts_completed: number;
  meals_adherent: number;
  meals_planned: number;
  water_goal_days: number;
  devotional_days: number;
  bible_reading_days: number;
  weight_logs_count: number;
  personal_expenses: string | number;
  sales_revenue: string | number;
  sales_profit: string | number;
  leads_count: number;
};

export function mapWeeklyReviewSnapshotRow(
  row: WeeklyReviewSnapshotRow,
): WeeklyReviewSnapshot {
  return {
    xpEarned: row.xp_earned,
    tasksCompleted: row.tasks_completed,
    tasksTotal: row.tasks_total,
    habitsCompleted: row.habits_completed,
    workoutsCompleted: row.workouts_completed,
    mealsAdherent: row.meals_adherent,
    mealsPlanned: row.meals_planned,
    waterGoalDays: row.water_goal_days,
    devotionalDays: row.devotional_days,
    bibleReadingDays: row.bible_reading_days,
    weightLogsCount: row.weight_logs_count,
    personalExpensesCents: parseMoneyToCents(row.personal_expenses),
    salesRevenueCents: parseMoneyToCents(row.sales_revenue),
    salesProfitCents: parseMoneyToCents(row.sales_profit),
    leadsCount: row.leads_count,
  };
}

export type WeeklyReview = WeeklyReviewSnapshot & {
  id: string;
  weekStart: string;
  whatWorked: string | null;
  whatDidntWork: string | null;
  improvement: string | null;
  nextWeekPriority: string | null;
};

export type WeeklyReviewRow = WeeklyReviewSnapshotRow & {
  id: string;
  week_start: string;
  what_worked: string | null;
  what_didnt_work: string | null;
  improvement: string | null;
  next_week_priority: string | null;
};

export function mapWeeklyReviewRow(row: WeeklyReviewRow): WeeklyReview {
  return {
    ...mapWeeklyReviewSnapshotRow(row),
    id: row.id,
    weekStart: row.week_start,
    whatWorked: row.what_worked,
    whatDidntWork: row.what_didnt_work,
    improvement: row.improvement,
    nextWeekPriority: row.next_week_priority,
  };
}
