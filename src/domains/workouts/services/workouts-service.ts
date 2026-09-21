import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateWorkoutPlanInput } from "../schemas/workout-schema";
import {
  mapExerciseSetRow,
  mapWorkoutExerciseRow,
  mapWorkoutPlanRow,
  mapWorkoutSessionRow,
  type ExerciseSet,
  type ExerciseSetRow,
  type WorkoutExercise,
  type WorkoutExerciseRow,
  type WorkoutPlan,
  type WorkoutPlanRow,
  type WorkoutSession,
  type WorkoutSessionRow,
} from "../types/workout";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listActiveWorkoutPlans(
  supabase: SupabaseClient,
): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<WorkoutPlanRow[]>();

  if (error) throwFriendly("Não foi possível carregar os planos de treino.");
  return (data ?? []).map(mapWorkoutPlanRow);
}

export async function listWorkoutExercisesForPlan(
  supabase: SupabaseClient,
  workoutPlanId: string,
): Promise<WorkoutExercise[]> {
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("workout_plan_id", workoutPlanId)
    .order("order_index", { ascending: true })
    .returns<WorkoutExerciseRow[]>();

  if (error) throwFriendly("Não foi possível carregar os exercícios do plano.");
  return (data ?? []).map(mapWorkoutExerciseRow);
}

/**
 * Não é uma operação crítica no sentido de XP/dinheiro (sem RPC): criar o
 * plano e seus exercícios é uma sequência simples de inserts. Se o segundo
 * insert falhar, o plano fica sem exercícios e o usuário pode editar depois
 * — não há efeito colateral (XP, estoque) que exija atomicidade aqui.
 */
export async function createWorkoutPlan(
  supabase: SupabaseClient,
  input: CreateWorkoutPlanInput,
): Promise<WorkoutPlan> {
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      name: input.name,
      muscle_groups: input.muscleGroups || null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single<WorkoutPlanRow>();

  if (planError) throwFriendly("Não foi possível criar o plano de treino.");

  const { error: exercisesError } = await supabase
    .from("workout_exercises")
    .insert(
      input.exercises.map((exercise, index) => ({
        workout_plan_id: plan!.id,
        name: exercise.name,
        muscle_group: exercise.muscleGroup || null,
        order_index: index,
        planned_sets: exercise.plannedSets ?? null,
        planned_reps: exercise.plannedReps || null,
        planned_load_kg: exercise.plannedLoadKg ?? null,
        rest_seconds: exercise.restSeconds ?? null,
      })),
    );

  if (exercisesError)
    throwFriendly("Plano criado, mas os exercícios não foram salvos.");

  return mapWorkoutPlanRow(plan!);
}

export async function startWorkoutSession(
  supabase: SupabaseClient,
  workoutPlanId: string | null,
  date: string,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .rpc("start_workout_session", {
      p_workout_plan_id: workoutPlanId,
      p_date: date,
    })
    .single<WorkoutSessionRow>();

  if (error) throwFriendly("Não foi possível iniciar o treino.");
  return mapWorkoutSessionRow(data!);
}

export async function logExerciseSet(
  supabase: SupabaseClient,
  params: {
    workoutSessionId: string;
    workoutExerciseId: string;
    setOrder: number;
    loadKg: number | null;
    reps: number | null;
  },
): Promise<ExerciseSet> {
  const { data, error } = await supabase
    .rpc("log_exercise_set", {
      p_workout_session_id: params.workoutSessionId,
      p_workout_exercise_id: params.workoutExerciseId,
      p_set_order: params.setOrder,
      p_load_kg: params.loadKg,
      p_reps: params.reps,
    })
    .single<ExerciseSetRow>();

  if (error) throwFriendly("Não foi possível registrar a série.");
  return mapExerciseSetRow(data!);
}

type CompleteWorkoutSessionRpcResult = {
  workout_session_row: WorkoutSessionRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function completeWorkoutSession(
  supabase: SupabaseClient,
  workoutSessionId: string,
): Promise<{ session: WorkoutSession; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("complete_workout_session", { p_workout_session_id: workoutSessionId })
    .single<CompleteWorkoutSessionRpcResult>();

  if (error) throwFriendly("Não foi possível concluir o treino.");
  return {
    session: mapWorkoutSessionRow(data!.workout_session_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}

export async function listSetsForSession(
  supabase: SupabaseClient,
  workoutSessionId: string,
): Promise<ExerciseSet[]> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("workout_session_id", workoutSessionId)
    .order("created_at", { ascending: true })
    .returns<ExerciseSetRow[]>();

  if (error) throwFriendly("Não foi possível carregar as séries do treino.");
  return (data ?? []).map(mapExerciseSetRow);
}

export async function listRecentSetsForExercise(
  supabase: SupabaseClient,
  workoutExerciseId: string,
  limit = 20,
): Promise<ExerciseSet[]> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .select("*")
    .eq("workout_exercise_id", workoutExerciseId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ExerciseSetRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico do exercício.");
  return (data ?? []).map(mapExerciseSetRow).reverse();
}

export async function listRecentSessions(
  supabase: SupabaseClient,
  limit = 10,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit)
    .returns<WorkoutSessionRow[]>();

  if (error) throwFriendly("Não foi possível carregar o histórico de treinos.");
  return (data ?? []).map(mapWorkoutSessionRow);
}
