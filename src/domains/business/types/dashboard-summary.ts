import { parseMoneyToCents } from "@/shared/lib/money";

export type TopSellingItem = {
  catalogItemId: string;
  name: string;
  quantity: number;
};
export type MostProfitableItem = {
  catalogItemId: string;
  name: string;
  profitCents: number;
};

export type BusinessDashboardSummary = {
  grossRevenueCents: number;
  netRevenueCents: number;
  directCostsCents: number;
  grossProfitCents: number;
  operatingExpensesCents: number;
  feesCents: number;
  netProfitCents: number;
  marginPercent: number | null;
  roiPercent: number | null;
  salesCount: number;
  averageTicketCents: number | null;
  topSellingItem: TopSellingItem | null;
  mostProfitableItem: MostProfitableItem | null;
  leadsCount: number;
  conversionPercent: number | null;
  pendingFollowUpsCount: number;
};

export type BusinessDashboardSummaryRow = {
  gross_revenue: string | number;
  net_revenue: string | number;
  direct_costs: string | number;
  gross_profit: string | number;
  operating_expenses: string | number;
  fees: string | number;
  net_profit: string | number;
  margin_percent: string | number | null;
  roi_percent: string | number | null;
  sales_count: string | number;
  average_ticket: string | number | null;
  top_selling_item: {
    catalog_item_id: string;
    name: string;
    quantity: number;
  } | null;
  most_profitable_item: {
    catalog_item_id: string;
    name: string;
    profit: string | number;
  } | null;
  leads_count: string | number;
  conversion_percent: string | number | null;
  pending_follow_ups_count: string | number;
};

export function mapBusinessDashboardSummaryRow(
  row: BusinessDashboardSummaryRow,
): BusinessDashboardSummary {
  return {
    grossRevenueCents: parseMoneyToCents(row.gross_revenue),
    netRevenueCents: parseMoneyToCents(row.net_revenue),
    directCostsCents: parseMoneyToCents(row.direct_costs),
    grossProfitCents: parseMoneyToCents(row.gross_profit),
    operatingExpensesCents: parseMoneyToCents(row.operating_expenses),
    feesCents: parseMoneyToCents(row.fees),
    netProfitCents: parseMoneyToCents(row.net_profit),
    marginPercent:
      row.margin_percent === null ? null : Number(row.margin_percent),
    roiPercent: row.roi_percent === null ? null : Number(row.roi_percent),
    salesCount: Number(row.sales_count),
    averageTicketCents:
      row.average_ticket === null
        ? null
        : parseMoneyToCents(row.average_ticket),
    topSellingItem: row.top_selling_item
      ? {
          catalogItemId: row.top_selling_item.catalog_item_id,
          name: row.top_selling_item.name,
          quantity: row.top_selling_item.quantity,
        }
      : null,
    mostProfitableItem: row.most_profitable_item
      ? {
          catalogItemId: row.most_profitable_item.catalog_item_id,
          name: row.most_profitable_item.name,
          profitCents: parseMoneyToCents(row.most_profitable_item.profit),
        }
      : null,
    leadsCount: Number(row.leads_count),
    conversionPercent:
      row.conversion_percent === null ? null : Number(row.conversion_percent),
    pendingFollowUpsCount: Number(row.pending_follow_ups_count),
  };
}
