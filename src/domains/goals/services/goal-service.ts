import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateQuarterlyGoalInput } from "../schemas/goal-schema";
import { type Goal, type GoalRow, mapGoalRow } from "../types/goal";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listQuarterlyGoals(
  supabase: SupabaseClient,
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("type", "trimestral")
    .order("period_start", { ascending: false })
    .returns<GoalRow[]>();

  if (error) throwFriendly("Não foi possível carregar as metas trimestrais.");
  return (data ?? []).map(mapGoalRow);
}

export async function createQuarterlyGoal(
  supabase: SupabaseClient,
  input: CreateQuarterlyGoalInput,
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      title: input.title,
      type: "trimestral",
      kind: input.kind,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      target_value: input.targetValue ?? null,
    })
    .select("*")
    .single<GoalRow>();

  if (error) throwFriendly("Não foi possível criar a meta trimestral.");
  return mapGoalRow(data!);
}

export async function updateGoalProgress(
  supabase: SupabaseClient,
  goalId: string,
  currentValue: number | undefined,
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update({ current_value: currentValue ?? null })
    .eq("id", goalId)
    .select("*")
    .single<GoalRow>();

  if (error) throwFriendly("Não foi possível atualizar o progresso da meta.");
  return mapGoalRow(data!);
}

export async function setGoalCompleted(
  supabase: SupabaseClient,
  goalId: string,
  isCompleted: boolean,
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update({ is_completed: isCompleted })
    .eq("id", goalId)
    .select("*")
    .single<GoalRow>();

  if (error) throwFriendly("Não foi possível atualizar a meta.");
  return mapGoalRow(data!);
}
