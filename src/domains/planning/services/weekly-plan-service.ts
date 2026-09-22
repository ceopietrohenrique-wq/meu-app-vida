import type { SupabaseClient } from "@supabase/supabase-js";

import type { WeeklyPlanInput } from "../schemas/weekly-plan-schema";
import {
  mapWeeklyPlanRow,
  type WeeklyPlan,
  type WeeklyPlanRow,
} from "../types/weekly-plan";

export async function getWeeklyPlan(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<WeeklyPlan | null> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("week_start", weekStart)
    .maybeSingle<WeeklyPlanRow>();

  if (error)
    throw new Error("Não foi possível carregar o planejamento da semana.");
  return data ? mapWeeklyPlanRow(data) : null;
}

export async function saveWeeklyPlan(
  supabase: SupabaseClient,
  weekStart: string,
  input: WeeklyPlanInput,
): Promise<WeeklyPlan> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .upsert(
      {
        week_start: weekStart,
        top_priorities: input.topPriorities,
        planned_workouts: input.plannedWorkouts ?? null,
        weekly_xp_goal: input.weeklyXpGoal ?? null,
        notes: input.notes || null,
        quarterly_goal_id: input.quarterlyGoalId || null,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single<WeeklyPlanRow>();

  if (error)
    throw new Error("Não foi possível salvar o planejamento da semana.");
  return mapWeeklyPlanRow(data!);
}
