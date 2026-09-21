import { parseMoneyToCents } from "@/shared/lib/money";

import type { FinanceContext } from "./account";

export type RecurrenceType = "income" | "expense";

export type Recurrence = {
  id: string;
  name: string;
  type: RecurrenceType;
  context: FinanceContext;
  accountId: string;
  categoryId: string | null;
  paymentMethod: string | null;
  amountCents: number;
  dayOfMonth: number;
  startsOn: string;
  endsOn: string | null;
  totalInstallments: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurrenceRow = {
  id: string;
  name: string;
  type: RecurrenceType;
  context: FinanceContext;
  account_id: string;
  category_id: string | null;
  payment_method: string | null;
  amount: string | number;
  day_of_month: number;
  starts_on: string;
  ends_on: string | null;
  total_installments: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapRecurrenceRow(row: RecurrenceRow): Recurrence {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    context: row.context,
    accountId: row.account_id,
    categoryId: row.category_id,
    paymentMethod: row.payment_method,
    amountCents: parseMoneyToCents(row.amount),
    dayOfMonth: row.day_of_month,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    totalInstallments: row.total_installments,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
