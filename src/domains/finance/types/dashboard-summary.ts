import { parseMoneyToCents } from "@/shared/lib/money";

export type TopCategory = {
  categoryId: string;
  categoryName: string;
  totalCents: number;
};

export type DashboardSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  previousIncomeCents: number;
  previousExpenseCents: number;
  topCategories: TopCategory[];
};

export type DashboardSummaryRow = {
  income: string | number;
  expense: string | number;
  balance: string | number;
  previous_income: string | number;
  previous_expense: string | number;
  top_categories: {
    category_id: string;
    category_name: string;
    total: string | number;
  }[];
};

export function mapDashboardSummaryRow(
  row: DashboardSummaryRow,
): DashboardSummary {
  return {
    incomeCents: parseMoneyToCents(row.income),
    expenseCents: parseMoneyToCents(row.expense),
    balanceCents: parseMoneyToCents(row.balance),
    previousIncomeCents: parseMoneyToCents(row.previous_income),
    previousExpenseCents: parseMoneyToCents(row.previous_expense),
    topCategories: (row.top_categories ?? []).map((c) => ({
      categoryId: c.category_id,
      categoryName: c.category_name,
      totalCents: parseMoneyToCents(c.total),
    })),
  };
}
