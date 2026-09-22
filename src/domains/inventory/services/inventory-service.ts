import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateInventoryMovementInput } from "../schemas/inventory-movement-schema";
import {
  type InventoryLevel,
  type InventoryLevelRow,
  mapInventoryLevelRow,
} from "../types/inventory";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listInventoryLevels(
  supabase: SupabaseClient,
): Promise<InventoryLevel[]> {
  const { data, error } = await supabase.rpc("get_inventory_levels");
  if (error) throwFriendly("Não foi possível carregar o estoque.");
  return ((data ?? []) as InventoryLevelRow[]).map(mapInventoryLevelRow);
}

/**
 * clientRequestId protege lançamentos manuais de estoque contra
 * double-submit — mesmo padrão de idempotência do Financeiro/Vendas.
 */
export async function createInventoryMovement(
  supabase: SupabaseClient,
  input: CreateInventoryMovementInput,
  clientRequestId: string,
): Promise<void> {
  const sign =
    input.type === "saida" || (input.type === "ajuste" && !input.increase)
      ? -1
      : 1;

  const { error } = await supabase.from("inventory_movements").insert({
    catalog_item_id: input.catalogItemId,
    type: input.type,
    quantity_delta: sign * input.quantity,
    notes: input.notes || null,
    client_request_id: clientRequestId,
  });

  // 23505 = unique_violation em (user_id, client_request_id): reenvio de
  // double-submit — a movimentação já foi registrada, tratamos como
  // sucesso idempotente em vez de mostrar erro para o usuário.
  if (error && error.code !== "23505") {
    throwFriendly("Não foi possível registrar a movimentação de estoque.");
  }
}

export async function setInventoryMinimumQuantity(
  supabase: SupabaseClient,
  catalogItemId: string,
  minimumQuantity: number | undefined,
): Promise<void> {
  const { error } = await supabase.from("inventory_settings").upsert(
    {
      catalog_item_id: catalogItemId,
      minimum_quantity: minimumQuantity ?? null,
    },
    { onConflict: "catalog_item_id" },
  );

  if (error) throwFriendly("Não foi possível salvar o estoque mínimo.");
}
