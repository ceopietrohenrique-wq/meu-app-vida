import type { SupabaseClient } from "@supabase/supabase-js";

import { toCsv } from "@/shared/lib/export/csv";
import { fetchAllRows } from "@/shared/lib/export/paginate";
import { centsToDecimalString } from "@/shared/lib/money";

import type { FinanceContext } from "../types/account";
import { mapTransactionRow, type TransactionRow } from "../types/transaction";

const TYPE_LABEL: Record<string, string> = {
  income: "receita",
  expense: "despesa",
  transfer: "transferência",
};

const CONTEXT_LABEL: Record<FinanceContext, string> = {
  pessoal: "pessoal",
  empresarial: "empresarial",
};

export type ExportTransactionsFilters = {
  periodStart?: string;
  periodEnd?: string;
  context?: FinanceContext;
};

/**
 * Exporta TODAS as transações do usuário autenticado que casam com o
 * filtro (ou tudo, se nenhum filtro for passado) — nunca recebe um
 * `userId` de fora: a query é sempre escopada pela sessão via RLS, o mesmo
 * client autenticado usado no resto do app (nunca service_role, nunca uma
 * rota server-side paralela). Pagina em lotes (fetchAllRows) para nunca
 * truncar silenciosamente um usuário com muitas transações.
 */
export async function exportTransactionsCsv(
  supabase: SupabaseClient,
  filters: ExportTransactionsFilters = {},
): Promise<string> {
  const [transactionRows, accounts, categories] = await Promise.all([
    fetchAllRows<TransactionRow>(async (from, to) => {
      let query = supabase
        .from("finance_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (filters.periodStart)
        query = query.gte("transaction_date", filters.periodStart);
      if (filters.periodEnd)
        query = query.lte("transaction_date", filters.periodEnd);
      if (filters.context) query = query.eq("context", filters.context);
      return query.returns<TransactionRow[]>();
    }),
    supabase
      .from("finance_accounts")
      .select("id, name")
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("finance_categories")
      .select("id, name")
      .returns<{ id: string; name: string }[]>(),
  ]);

  if (accounts.error) throw new Error("Não foi possível carregar as contas.");
  if (categories.error)
    throw new Error("Não foi possível carregar as categorias.");

  const accountNameById = new Map(
    (accounts.data ?? []).map((a) => [a.id, a.name]),
  );
  const categoryNameById = new Map(
    (categories.data ?? []).map((c) => [c.id, c.name]),
  );

  const transactions = transactionRows.map(mapTransactionRow);

  const headers = [
    "data",
    "descricao",
    "tipo",
    "categoria",
    "conta",
    "valor",
    "contexto",
    "status",
    "observacao",
  ];

  const rows = transactions.map((t) => [
    t.transactionDate,
    t.description ?? "",
    TYPE_LABEL[t.type] ?? t.type,
    t.categoryId ? (categoryNameById.get(t.categoryId) ?? "") : "",
    accountNameById.get(t.accountId) ?? "",
    centsToDecimalString(t.amountCents),
    CONTEXT_LABEL[t.context],
    t.canceledAt ? "cancelada" : "ativa",
    t.notes ?? "",
  ]);

  return toCsv(headers, rows);
}
