export type InventoryLevel = {
  catalogItemId: string;
  quantityOnHand: number;
  minimumQuantity: number | null;
};

export type InventoryLevelRow = {
  catalog_item_id: string;
  quantity_on_hand: number;
  minimum_quantity: number | null;
};

export function mapInventoryLevelRow(row: InventoryLevelRow): InventoryLevel {
  return {
    catalogItemId: row.catalog_item_id,
    quantityOnHand: row.quantity_on_hand,
    minimumQuantity: row.minimum_quantity,
  };
}

export type InventoryMovementType =
  "entrada" | "saida" | "ajuste" | "venda" | "estorno";

export type InventoryMovement = {
  id: string;
  catalogItemId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  referenceSaleId: string | null;
  notes: string | null;
  createdAt: string;
};

export type InventoryMovementRow = {
  id: string;
  catalog_item_id: string;
  type: InventoryMovementType;
  quantity_delta: number;
  reference_sale_id: string | null;
  notes: string | null;
  created_at: string;
};

export function mapInventoryMovementRow(
  row: InventoryMovementRow,
): InventoryMovement {
  return {
    id: row.id,
    catalogItemId: row.catalog_item_id,
    type: row.type,
    quantityDelta: row.quantity_delta,
    referenceSaleId: row.reference_sale_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
