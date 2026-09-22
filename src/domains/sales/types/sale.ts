import { parseMoneyToCents } from "@/shared/lib/money";

export type SaleStatus =
  | "draft"
  | "negotiating"
  | "confirmed"
  | "paid"
  | "delivered"
  | "cancelled"
  | "refunded";

export type Sale = {
  id: string;
  businessId: string | null;
  customerId: string | null;
  accountId: string | null;
  status: SaleStatus;
  grossAmountCents: number;
  discountAmountCents: number;
  netAmountCents: number;
  directCostsCents: number;
  feesCents: number;
  paymentMethod: string | null;
  saleDate: string;
  responsible: string | null;
  notes: string | null;
  stockDeductedAt: string | null;
  stockRevertedAt: string | null;
  revenueTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaleRow = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  account_id: string | null;
  status: SaleStatus;
  gross_amount: string | number;
  discount_amount: string | number;
  net_amount: string | number;
  direct_costs: string | number;
  fees: string | number;
  payment_method: string | null;
  sale_date: string;
  responsible: string | null;
  notes: string | null;
  stock_deducted_at: string | null;
  stock_reverted_at: string | null;
  revenue_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export function mapSaleRow(row: SaleRow): Sale {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    accountId: row.account_id,
    status: row.status,
    grossAmountCents: parseMoneyToCents(row.gross_amount),
    discountAmountCents: parseMoneyToCents(row.discount_amount),
    netAmountCents: parseMoneyToCents(row.net_amount),
    directCostsCents: parseMoneyToCents(row.direct_costs),
    feesCents: parseMoneyToCents(row.fees),
    paymentMethod: row.payment_method,
    saleDate: row.sale_date,
    responsible: row.responsible,
    notes: row.notes,
    stockDeductedAt: row.stock_deducted_at,
    stockRevertedAt: row.stock_reverted_at,
    revenueTransactionId: row.revenue_transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SaleItem = {
  id: string;
  saleId: string;
  catalogItemId: string;
  itemName: string;
  itemType: "produto" | "servico";
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
  discountAmountCents: number;
  tracksInventory: boolean;
  totalCents: number;
  createdAt: string;
};

export type SaleItemRow = {
  id: string;
  sale_id: string;
  catalog_item_id: string;
  item_name: string;
  item_type: "produto" | "servico";
  quantity: number;
  unit_price: string | number;
  unit_cost: string | number;
  discount_amount: string | number;
  tracks_inventory: boolean;
  total: string | number;
  created_at: string;
};

export function mapSaleItemRow(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    catalogItemId: row.catalog_item_id,
    itemName: row.item_name,
    itemType: row.item_type,
    quantity: row.quantity,
    unitPriceCents: parseMoneyToCents(row.unit_price),
    unitCostCents: parseMoneyToCents(row.unit_cost),
    discountAmountCents: parseMoneyToCents(row.discount_amount),
    tracksInventory: row.tracks_inventory,
    totalCents: parseMoneyToCents(row.total),
    createdAt: row.created_at,
  };
}
