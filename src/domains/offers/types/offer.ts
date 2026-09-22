import { parseMoneyToCents } from "@/shared/lib/money";

export type OfferDiscountType = "percent" | "fixed";

export type OfferItem = {
  id: string;
  catalogItemId: string;
  quantity: number;
  unitPriceOverrideCents: number | null;
};

export type OfferItemRow = {
  id: string;
  catalog_item_id: string;
  quantity: number;
  unit_price_override: string | number | null;
};

export function mapOfferItemRow(row: OfferItemRow): OfferItem {
  return {
    id: row.id,
    catalogItemId: row.catalog_item_id,
    quantity: row.quantity,
    unitPriceOverrideCents:
      row.unit_price_override === null
        ? null
        : parseMoneyToCents(row.unit_price_override),
  };
}

export type Offer = {
  id: string;
  businessId: string | null;
  name: string;
  description: string | null;
  discountType: OfferDiscountType | null;
  /** percent: 0-100 puro. fixed: centavos (via parseMoneyToCents). */
  discountValue: number | null;
  isActive: boolean;
  items: OfferItem[];
  createdAt: string;
  updatedAt: string;
};

export type OfferRow = {
  id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  discount_type: OfferDiscountType | null;
  discount_value: string | number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapOfferRow(row: OfferRow, items: OfferItem[]): Offer {
  const discountValue =
    row.discount_value === null
      ? null
      : row.discount_type === "fixed"
        ? parseMoneyToCents(row.discount_value)
        : Number(row.discount_value);

  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue,
    isActive: row.is_active,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
