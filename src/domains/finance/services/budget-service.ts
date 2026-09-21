import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateBudgetInput } from "../schemas/budget-schema";
import { type Budget, type BudgetRow, mapBudgetRow } from "../types/budget";

function throwFriendly(message: string): never {
  throw new Error(message);
}

function normalizePeriodMonth(periodMonth: string): string {
  // <input type="month"> entrega "2026-03" — o banco espera "2026-03-01".
  return periodMonth.length === 7 ? `${periodMonth}-01` : periodMonth;
}

export async function listBudgets(
  supabase: SupabaseClient,
  periodMonth: string,
): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("finance_budgets")
    .select("*")
    .eq("period_month", normalizePeriodMonth(periodMonth))
    .returns<BudgetRow[]>();

  if (error) throwFriendly("Não foi possível carregar os orçamentos.");
  return (data ?? []).map(mapBudgetRow);
}

export async function createBudget(
  supabase: SupabaseClient,
  input: CreateBudgetInput,
): Promise<Budget> {
  const { data, error } = await supabase
    .from("finance_budgets")
    .insert({
      category_id: input.categoryId,
      context: input.context,
      period_month: normalizePeriodMonth(input.periodMonth),
      planned_amount: centsToDecimalString(input.plannedAmount),
      ...(input.alertThresholds
        ? { alert_thresholds: input.alertThresholds }
        : {}),
    })
    .select("*")
    .single<BudgetRow>();

  if (error)
    throwFriendly(
      "Não foi possível criar o orçamento (já existe um para essa categoria nesse mês?).",
    );
  return mapBudgetRow(data!);
}
