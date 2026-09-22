export type WeeklyPlan = {
  id: string;
  weekStart: string;
  topPriorities: string[];
  plannedWorkouts: number | null;
  weeklyXpGoal: number | null;
  notes: string | null;
  /** Meta trimestral vinculada (opcional) — ver Fase 6 > Metas trimestrais. */
  quarterlyGoalId: string | null;
};

export type WeeklyPlanRow = {
  id: string;
  week_start: string;
  top_priorities: string[];
  planned_workouts: number | null;
  weekly_xp_goal: number | null;
  notes: string | null;
  quarterly_goal_id: string | null;
};

export function mapWeeklyPlanRow(row: WeeklyPlanRow): WeeklyPlan {
  return {
    id: row.id,
    weekStart: row.week_start,
    topPriorities: row.top_priorities,
    plannedWorkouts: row.planned_workouts,
    weeklyXpGoal: row.weekly_xp_goal,
    notes: row.notes,
    quarterlyGoalId: row.quarterly_goal_id,
  };
}
