export type GoalType =
  "semanal" | "mensal" | "trimestral" | "anual" | "personalizada";
export type GoalKind = "resultado" | "processo";

export type Goal = {
  id: string;
  title: string;
  type: GoalType;
  kind: GoalKind;
  periodStart: string;
  periodEnd: string;
  targetValue: number | null;
  currentValue: number | null;
  lifeAreaId: string | null;
  isCompleted: boolean;
  parentGoalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalRow = {
  id: string;
  title: string;
  type: GoalType;
  kind: GoalKind;
  period_start: string;
  period_end: string;
  target_value: number | null;
  current_value: number | null;
  life_area_id: string | null;
  is_completed: boolean;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
};

export function mapGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    kind: row.kind,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    targetValue: row.target_value,
    currentValue: row.current_value,
    lifeAreaId: row.life_area_id,
    isCompleted: row.is_completed,
    parentGoalId: row.parent_goal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
