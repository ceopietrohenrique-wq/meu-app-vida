import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateTransactionInput } from "../schemas/transaction-schema";
import type { FinanceContext } from "../types/account";
import {
  mapTransactionRow,
  type Transaction,
  type TransactionRow,
} from "../types/transaction";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export type ListTransactionsFilters = {
  periodStart: string;
  periodEnd: string;
  context?: FinanceContext;
  accountId?: string;
};

export async function listTransactions(
  supabase: SupabaseClient,
  filters: ListTransactionsFilters,
): Promise<Transaction[]> {
  let query = supabase
    .from("finance_transactions")
    .select("*")
    .gte("transaction_date", filters.periodStart)
    .lte("transaction_date", filters.periodEnd)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.context) query = query.eq("context", filters.context);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);

  const { data, error } = await query.returns<TransactionRow[]>();
  if (error) throwFriendly("Não foi possível carregar as transações.");
  return (data ?? []).map(mapTransactionRow);
}

/**
 * clientRequestId é gerado uma única vez no client por "intenção de envio"
 * (não a cada clique) e reenviado em toda tentativa daquele mesmo envio —
 * é o que torna esta chamada segura contra double-submit (clique duplo,
 * retry de rede): a RPC nunca cria uma segunda linha para a mesma chave
 * (UNIQUE(user_id, client_request_id) no banco, ver
 * docs/business-rules.md > Fase 4 > 1).
 */
export async function createTransaction(
  supabase: SupabaseClient,
  input: CreateTransactionInput,
  clientRequestId: string,
): Promise<Transaction> {
  const { data, error } = await supabase
    .rpc("create_finance_transaction", {
      p_account_id: input.accountId,
      p_type: input.type,
      p_context: input.context,
      p_amount: centsToDecimalString(input.amount),
      p_transaction_date: input.transactionDate,
      p_description: input.description || null,
      p_category_id: input.categoryId || null,
      p_payment_method: input.paymentMethod || null,
      p_transfer_account_id:
        input.type === "transfer" ? input.transferAccountId : null,
      p_notes: input.notes || null,
      p_client_request_id: clientRequestId,
    })
    .single<TransactionRow>();

  if (error) throwFriendly("Não foi possível registrar a transação.");
  return mapTransactionRow(data!);
}

export async function cancelTransaction(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("finance_transactions")
    .update({ canceled_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (error) throwFriendly("Não foi possível cancelar a transação.");
}
