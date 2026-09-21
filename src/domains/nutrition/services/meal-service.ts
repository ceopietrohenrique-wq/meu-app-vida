import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateMealPlanInput } from "../schemas/meal-schema";
import {
  mapMealLogRow,
  mapMealPlanRow,
  type MealLog,
  type MealLogRow,
  type MealLogStatus,
  type MealPlan,
  type MealPlanRow,
} from "../types/meal";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listActiveMealPlans(
  supabase: SupabaseClient,
): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .returns<MealPlanRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar as refeições planejadas.");
  return (data ?? []).map(mapMealPlanRow);
}

export async function createMealPlan(
  supabase: SupabaseClient,
  input: CreateMealPlanInput,
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      name: input.name,
      time: input.time || null,
      items: input.items ?? null,
      calories: input.calories ?? null,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single<MealPlanRow>();

  if (error) throwFriendly("Não foi possível criar a refeição planejada.");
  return mapMealPlanRow(data!);
}

export async function listMealLogsSince(
  supabase: SupabaseClient,
  sinceDate: string,
): Promise<MealLog[]> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("id, meal_plan_id, date, status")
    .gte("date", sinceDate)
    .returns<MealLogRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico de refeições.");
  return (data ?? []).map(mapMealLogRow);
}

type SetMealLogStatusRpcResult = {
  meal_log_row: MealLogRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function setMealLogStatus(
  supabase: SupabaseClient,
  mealPlanId: string,
  date: string,
  status: MealLogStatus,
): Promise<{ mealLog: MealLog; xpAwarded: boolean; xpAmount: number }> {
  const { data, error } = await supabase
    .rpc("set_meal_log_status", {
      p_meal_plan_id: mealPlanId,
      p_date: date,
      p_status: status,
    })
    .single<SetMealLogStatusRpcResult>();

  if (error) throwFriendly("Não foi possível atualizar o status da refeição.");
  return {
    mealLog: mapMealLogRow(data!.meal_log_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}
