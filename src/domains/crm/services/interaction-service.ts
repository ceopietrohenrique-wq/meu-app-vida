import type { SupabaseClient } from "@supabase/supabase-js";

import type { LogInteractionInput } from "../schemas/interaction-schema";
import {
  type CustomerInteraction,
  type CustomerInteractionRow,
  mapCustomerInteractionRow,
} from "../types/customer-interaction";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listCustomerInteractions(
  supabase: SupabaseClient,
  customerId: string,
): Promise<CustomerInteraction[]> {
  const { data, error } = await supabase
    .from("customer_interactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("occurred_at", { ascending: false })
    .returns<CustomerInteractionRow[]>();

  if (error)
    throwFriendly("Não foi possível carregar o histórico de interações.");
  return (data ?? []).map(mapCustomerInteractionRow);
}

export async function logInteraction(
  supabase: SupabaseClient,
  input: LogInteractionInput,
): Promise<CustomerInteraction> {
  const { data, error } = await supabase
    .from("customer_interactions")
    .insert({
      customer_id: input.customerId,
      type: input.type,
      notes: input.notes || null,
    })
    .select("*")
    .single<CustomerInteractionRow>();

  if (error) throwFriendly("Não foi possível registrar a interação.");
  return mapCustomerInteractionRow(data!);
}
