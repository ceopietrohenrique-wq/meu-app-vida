import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateCatalogItemInput } from "../schemas/catalog-item-schema";
import {
  type CatalogItem,
  type CatalogItemRow,
  mapCatalogItemRow,
} from "../types/catalog-item";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listCatalogItems(
  supabase: SupabaseClient,
  businessId?: string,
): Promise<CatalogItem[]> {
  let query = supabase.from("catalog_items").select("*").order("name");
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query.returns<CatalogItemRow[]>();
  if (error) throwFriendly("Não foi possível carregar o catálogo.");
  return (data ?? []).map(mapCatalogItemRow);
}

export async function createCatalogItem(
  supabase: SupabaseClient,
  input: CreateCatalogItemInput,
): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      business_id: input.businessId || null,
      name: input.name,
      type: input.type,
      description: input.description || null,
      default_price: centsToDecimalString(input.defaultPrice),
      default_cost: centsToDecimalString(input.defaultCost),
      sku: input.sku || null,
      tracks_inventory: input.tracksInventory,
      category: input.category || null,
    })
    .select("*")
    .single<CatalogItemRow>();

  if (error) throwFriendly("Não foi possível criar o item de catálogo.");
  return mapCatalogItemRow(data!);
}

export async function setCatalogItemActive(
  supabase: SupabaseClient,
  catalogItemId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("catalog_items")
    .update({ is_active: isActive })
    .eq("id", catalogItemId);

  if (error) throwFriendly("Não foi possível atualizar o item de catálogo.");
}
