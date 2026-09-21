import { parseMoneyToCents } from "@/shared/lib/money";

export type AccountType =
  "carteira" | "conta_bancaria" | "cartao" | "caixa_empresa" | "outra";

export type FinanceContext = "pessoal" | "empresarial";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  balanceCents: number;
  isActive: boolean;
  context: FinanceContext;
  createdAt: string;
  updatedAt: string;
};

export type AccountWithBalanceRow = {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: string | number;
  balance: string | number;
  is_active: boolean;
  context: FinanceContext;
  created_at: string;
  updated_at: string;
};

export function mapAccountWithBalanceRow(row: AccountWithBalanceRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalanceCents: parseMoneyToCents(row.initial_balance),
    balanceCents: parseMoneyToCents(row.balance),
    isActive: row.is_active,
    context: row.context,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
