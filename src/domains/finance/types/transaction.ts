import { parseMoneyToCents } from "@/shared/lib/money";

import type { FinanceContext } from "./account";

export type TransactionType = "income" | "expense" | "transfer";

export type Transaction = {
  id: string;
  accountId: string;
  type: TransactionType;
  context: FinanceContext;
  amountCents: number;
  description: string | null;
  categoryId: string | null;
  transactionDate: string;
  paymentMethod: string | null;
  businessId: string | null;
  saleId: string | null;
  transferAccountId: string | null;
  recurrenceId: string | null;
  notes: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionRow = {
  id: string;
  account_id: string;
  type: TransactionType;
  context: FinanceContext;
  amount: string | number;
  description: string | null;
  category_id: string | null;
  transaction_date: string;
  payment_method: string | null;
  business_id: string | null;
  sale_id: string | null;
  transfer_account_id: string | null;
  recurrence_id: string | null;
  notes: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    context: row.context,
    amountCents: parseMoneyToCents(row.amount),
    description: row.description,
    categoryId: row.category_id,
    transactionDate: row.transaction_date,
    paymentMethod: row.payment_method,
    businessId: row.business_id,
    saleId: row.sale_id,
    transferAccountId: row.transfer_account_id,
    recurrenceId: row.recurrence_id,
    notes: row.notes,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
