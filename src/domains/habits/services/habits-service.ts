import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateHabitInput } from "../schemas/habit-schema";
import {
  mapHabitRow,
  type Habit,
  type HabitLogRow,
  type HabitRow,
} from "../types/habit";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listActiveHabits(
  supabase: SupabaseClient,
): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<HabitRow[]>();

  if (error) throwFriendly("Não foi possível carregar os hábitos.");
  return (data ?? []).map(mapHabitRow);
}

/**
 * Logs desde `sinceDate` (inclusive) de vários hábitos de uma vez, usados
 * para calcular streak e taxa de conclusão sem fazer uma query por hábito.
 * Retorna um mapa habit_id -> lista de datas (yyyy-MM-dd).
 */
export async function listHabitLogsSinceForHabits(
  supabase: SupabaseClient,
  habitIds: string[],
  sinceDate: string,
): Promise<Record<string, string[]>> {
  if (habitIds.length === 0) return {};

  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, date")
    .in("habit_id", habitIds)
    .gte("date", sinceDate)
    .returns<Pick<HabitLogRow, "habit_id" | "date">[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico dos hábitos.");

  const byHabit: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (byHabit[row.habit_id] ??= []).push(row.date);
  }
  return byHabit;
}

export async function createHabit(
  supabase: SupabaseClient,
  input: CreateHabitInput,
): Promise<Habit> {
  const { data, error } = await supabase
    .from("habits")
    .insert({
      name: input.name,
      frequency: input.frequency,
      days_of_week:
        input.frequency === "dias_da_semana" ? input.daysOfWeek : null,
      xp_reward: input.xpReward,
    })
    .select("*")
    .single<HabitRow>();

  if (error) throwFriendly("Não foi possível criar o hábito.");
  return mapHabitRow(data!);
}

type CompleteHabitRpcResult = {
  habit_log_row: HabitLogRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function completeHabit(
  supabase: SupabaseClient,
  habitId: string,
  date: string,
): Promise<{ xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("complete_habit", { p_habit_id: habitId, p_date: date })
    .single<CompleteHabitRpcResult>();

  if (error) throwFriendly("Não foi possível marcar o hábito como concluído.");
  return { xpAwarded: data!.xp_awarded, xpAmount: data!.xp_amount };
}

export async function uncompleteHabit(
  supabase: SupabaseClient,
  habitId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.rpc("uncomplete_habit", {
    p_habit_id: habitId,
    p_date: date,
  });
  if (error) throwFriendly("Não foi possível desmarcar o hábito.");
}
