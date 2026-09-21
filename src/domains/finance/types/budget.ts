import { parseMoneyToCents } from "@/shared/lib/money";

import type { FinanceContext } from "./account";

export type Budget = {
  id: string;
  categoryId: string;
  context: FinanceContext;
  periodMonth: string;
  plannedAmountCents: number;
  /** Percentuais que disparam alerta (ex.: [80, 90, 100]) — configurável por orçamento, padrão sugerido 80/90/100. */
  alertThresholds: number[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetRow = {
  id: string;
  category_id: string;
  context: FinanceContext;
  period_month: string;
  planned_amount: string | number;
  alert_thresholds: number[];
  created_at: string;
  updated_at: string;
};

export function mapBudgetRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    context: row.context,
    periodMonth: row.period_month,
    plannedAmountCents: parseMoneyToCents(row.planned_amount),
    alertThresholds: row.alert_thresholds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
