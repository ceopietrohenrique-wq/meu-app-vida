export type MealLogStatus = "realizada" | "parcial" | "nao_realizada";

export type MealPlan = {
  id: string;
  name: string;
  time: string | null;
  items: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
  orderIndex: number;
  isActive: boolean;
};

export type MealPlanRow = {
  id: string;
  name: string;
  time: string | null;
  items: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  order_index: number;
  is_active: boolean;
};

export function mapMealPlanRow(row: MealPlanRow): MealPlan {
  return {
    id: row.id,
    name: row.name,
    time: row.time,
    items: row.items,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    notes: row.notes,
    orderIndex: row.order_index,
    isActive: row.is_active,
  };
}

export type MealLog = {
  id: string;
  mealPlanId: string;
  date: string;
  status: MealLogStatus;
};

export type MealLogRow = {
  id: string;
  meal_plan_id: string;
  date: string;
  status: MealLogStatus;
};

export function mapMealLogRow(row: MealLogRow): MealLog {
  return {
    id: row.id,
    mealPlanId: row.meal_plan_id,
    date: row.date,
    status: row.status,
  };
}
