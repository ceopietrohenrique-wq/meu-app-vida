import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateRecurrenceInput } from "../schemas/recurrence-schema";
import {
  mapRecurrenceRow,
  type Recurrence,
  type RecurrenceRow,
} from "../types/recurrence";
import {
  mapTransactionRow,
  type Transaction,
  type TransactionRow,
} from "../types/transaction";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listRecurrences(
  supabase: SupabaseClient,
): Promise<Recurrence[]> {
  const { data, error } = await supabase
    .from("finance_recurrences")
    .select("*")
    .eq("is_active", true)
    .order("day_of_month")
    .returns<RecurrenceRow[]>();

  if (error) throwFriendly("Não foi possível carregar as recorrências.");
  return (data ?? []).map(mapRecurrenceRow);
}

export async function createRecurrence(
  supabase: SupabaseClient,
  input: CreateRecurrenceInput,
): Promise<Recurrence> {
  const { data, error } = await supabase
    .from("finance_recurrences")
    .insert({
      name: input.name,
      type: input.type,
      context: input.context,
      account_id: input.accountId,
      category_id: input.categoryId || null,
      payment_method: input.paymentMethod || null,
      amount: centsToDecimalString(input.amount),
      day_of_month: input.dayOfMonth,
      starts_on: input.startsOn,
      ends_on: input.endsOn || null,
      total_installments: input.totalInstallments ?? null,
    })
    .select("*")
    .single<RecurrenceRow>();

  if (error) throwFriendly("Não foi possível criar a recorrência.");
  return mapRecurrenceRow(data!);
}

/**
 * Gera as ocorrências (transações) da recorrência até `untilDate`,
 * inclusive. Idempotente: chamar de novo para o mesmo período nunca
 * duplica (UNIQUE(recurrence_id, transaction_date) no banco).
 */
export async function generateRecurrenceOccurrences(
  supabase: SupabaseClient,
  recurrenceId: string,
  untilDate: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase.rpc(
    "generate_finance_recurrence_occurrences",
    {
      p_recurrence_id: recurrenceId,
      p_until: untilDate,
    },
  );

  if (error) throwFriendly("Não foi possível gerar as próximas ocorrências.");
  return ((data ?? []) as TransactionRow[]).map(mapTransactionRow);
}
