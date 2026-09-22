import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateBusinessInput } from "../schemas/business-schema";
import {
  type Business,
  type BusinessRow,
  mapBusinessRow,
} from "../types/business";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listBusinesses(
  supabase: SupabaseClient,
): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("name")
    .returns<BusinessRow[]>();

  if (error) throwFriendly("Não foi possível carregar os negócios.");
  return (data ?? []).map(mapBusinessRow);
}

export async function createBusiness(
  supabase: SupabaseClient,
  input: CreateBusinessInput,
): Promise<Business> {
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      name: input.name,
      segment: input.segment || null,
      notes: input.notes || null,
    })
    .select("*")
    .single<BusinessRow>();

  if (error) throwFriendly("Não foi possível criar o negócio.");
  return mapBusinessRow(data!);
}
