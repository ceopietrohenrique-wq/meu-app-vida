export type WorkoutPlan = {
  id: string;
  name: string;
  muscleGroups: string | null;
  notes: string | null;
  isActive: boolean;
};

export type WorkoutPlanRow = {
  id: string;
  name: string;
  muscle_groups: string | null;
  notes: string | null;
  is_active: boolean;
};

export function mapWorkoutPlanRow(row: WorkoutPlanRow): WorkoutPlan {
  return {
    id: row.id,
    name: row.name,
    muscleGroups: row.muscle_groups,
    notes: row.notes,
    isActive: row.is_active,
  };
}

export type WorkoutExercise = {
  id: string;
  workoutPlanId: string;
  name: string;
  muscleGroup: string | null;
  orderIndex: number;
  plannedSets: number | null;
  plannedReps: string | null;
  plannedLoadKg: number | null;
  restSeconds: number | null;
  notes: string | null;
};

export type WorkoutExerciseRow = {
  id: string;
  workout_plan_id: string;
  name: string;
  muscle_group: string | null;
  order_index: number;
  planned_sets: number | null;
  planned_reps: string | null;
  planned_load_kg: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

export function mapWorkoutExerciseRow(
  row: WorkoutExerciseRow,
): WorkoutExercise {
  return {
    id: row.id,
    workoutPlanId: row.workout_plan_id,
    name: row.name,
    muscleGroup: row.muscle_group,
    orderIndex: row.order_index,
    plannedSets: row.planned_sets,
    plannedReps: row.planned_reps,
    plannedLoadKg: row.planned_load_kg,
    restSeconds: row.rest_seconds,
    notes: row.notes,
  };
}

export type WorkoutSession = {
  id: string;
  workoutPlanId: string | null;
  date: string;
  startedAt: string;
  completedAt: string | null;
};

export type WorkoutSessionRow = {
  id: string;
  workout_plan_id: string | null;
  date: string;
  started_at: string;
  completed_at: string | null;
};

export function mapWorkoutSessionRow(row: WorkoutSessionRow): WorkoutSession {
  return {
    id: row.id,
    workoutPlanId: row.workout_plan_id,
    date: row.date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export type ExerciseSet = {
  id: string;
  workoutSessionId: string;
  workoutExerciseId: string;
  setOrder: number;
  loadKg: number | null;
  reps: number | null;
  createdAt: string;
};

export type ExerciseSetRow = {
  id: string;
  workout_session_id: string;
  workout_exercise_id: string;
  set_order: number;
  load_kg: number | null;
  reps: number | null;
  created_at: string;
};

export function mapExerciseSetRow(row: ExerciseSetRow): ExerciseSet {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    workoutExerciseId: row.workout_exercise_id,
    setOrder: row.set_order,
    loadKg: row.load_kg,
    reps: row.reps,
    createdAt: row.created_at,
  };
}
