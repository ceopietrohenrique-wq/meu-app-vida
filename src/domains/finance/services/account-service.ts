import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateAccountInput } from "../schemas/account-schema";
import {
  type Account,
  type AccountWithBalanceRow,
  mapAccountWithBalanceRow,
} from "../types/account";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listAccountsWithBalance(
  supabase: SupabaseClient,
): Promise<Account[]> {
  const { data, error } = await supabase.rpc(
    "get_finance_accounts_with_balance",
  );

  if (error) throwFriendly("Não foi possível carregar as contas.");
  return ((data ?? []) as AccountWithBalanceRow[]).map(
    mapAccountWithBalanceRow,
  );
}

export async function createAccount(
  supabase: SupabaseClient,
  input: CreateAccountInput,
): Promise<void> {
  const { error } = await supabase.from("finance_accounts").insert({
    name: input.name,
    type: input.type,
    initial_balance: centsToDecimalString(input.initialBalance),
    context: input.context,
  });

  if (error) throwFriendly("Não foi possível criar a conta.");
}

export async function setAccountActive(
  supabase: SupabaseClient,
  accountId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("finance_accounts")
    .update({ is_active: isActive })
    .eq("id", accountId);

  if (error) throwFriendly("Não foi possível atualizar a conta.");
}
