import { parseMoneyToCents } from "@/shared/lib/money";

export type CatalogItemType = "produto" | "servico";

export type CatalogItem = {
  id: string;
  businessId: string | null;
  name: string;
  type: CatalogItemType;
  description: string | null;
  defaultPriceCents: number;
  defaultCostCents: number;
  isActive: boolean;
  sku: string | null;
  tracksInventory: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogItemRow = {
  id: string;
  business_id: string | null;
  name: string;
  type: CatalogItemType;
  description: string | null;
  default_price: string | number;
  default_cost: string | number;
  is_active: boolean;
  sku: string | null;
  tracks_inventory: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCatalogItemRow(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    type: row.type,
    description: row.description,
    defaultPriceCents: parseMoneyToCents(row.default_price),
    defaultCostCents: parseMoneyToCents(row.default_cost),
    isActive: row.is_active,
    sku: row.sku,
    tracksInventory: row.tracks_inventory,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
