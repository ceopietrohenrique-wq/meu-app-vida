import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateCustomerInput,
  SetFollowUpInput,
  UpdateStageInput,
} from "../schemas/customer-schema";
import {
  type Customer,
  type CustomerRow,
  mapCustomerRow,
} from "../types/customer";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listCustomers(
  supabase: SupabaseClient,
  businessId?: string,
): Promise<Customer[]> {
  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query.returns<CustomerRow[]>();
  if (error) throwFriendly("Não foi possível carregar os clientes.");
  return (data ?? []).map(mapCustomerRow);
}

export async function createCustomer(
  supabase: SupabaseClient,
  input: CreateCustomerInput,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: input.businessId || null,
      name: input.name,
      company: input.company || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      instagram: input.instagram || null,
      email: input.email || null,
      segment: input.segment || null,
      city: input.city || null,
      notes: input.notes || null,
      stage: input.stage,
    })
    .select("*")
    .single<CustomerRow>();

  if (error) throwFriendly("Não foi possível criar o cliente.");
  return mapCustomerRow(data!);
}

export async function updateCustomerStage(
  supabase: SupabaseClient,
  input: UpdateStageInput,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update({ stage: input.stage })
    .eq("id", input.customerId)
    .select("*")
    .single<CustomerRow>();

  if (error) throwFriendly("Não foi possível atualizar o estágio do cliente.");
  return mapCustomerRow(data!);
}

export async function setCustomerFollowUp(
  supabase: SupabaseClient,
  input: SetFollowUpInput,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update({
      next_action: input.nextAction || null,
      next_action_date: input.nextActionDate || null,
      next_action_time: input.nextActionTime || null,
      next_action_notes: input.nextActionNotes || null,
    })
    .eq("id", input.customerId)
    .select("*")
    .single<CustomerRow>();

  if (error) throwFriendly("Não foi possível salvar a próxima ação.");
  return mapCustomerRow(data!);
}
