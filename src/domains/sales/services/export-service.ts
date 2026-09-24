import type { SupabaseClient } from "@supabase/supabase-js";

import { toCsv } from "@/shared/lib/export/csv";
import { fetchAllRows } from "@/shared/lib/export/paginate";
import { centsToDecimalString } from "@/shared/lib/money";

import { mapSaleRow, type SaleRow } from "../types/sale";
import {
  computeGrossProfitCents,
  computeMarginPercent,
} from "../utils/sale-indicators";

const STATUS_LABEL: Record<string, string> = {
  draft: "rascunho",
  negotiating: "negociando",
  confirmed: "confirmada",
  paid: "paga",
  delivered: "entregue",
  cancelled: "cancelada",
  refunded: "reembolsada",
};

export type ExportSalesFilters = {
  periodStart?: string;
  periodEnd?: string;
  businessId?: string;
};

/**
 * Exporta TODAS as vendas do usuário autenticado (RLS-escopado via
 * `auth.uid()`, mesmo client do resto do app — nunca recebe userId de
 * fora). Lucro/margem reaproveitam EXATAMENTE a mesma fórmula da RPC
 * get_business_dashboard_summary (computeGrossProfitCents/
 * computeMarginPercent, docs/business-rules.md > Fase 5) — nunca uma
 * segunda definição de "lucro" divergente.
 */
export async function exportSalesCsv(
  supabase: SupabaseClient,
  filters: ExportSalesFilters = {},
): Promise<string> {
  const [saleRows, customers] = await Promise.all([
    fetchAllRows<SaleRow>(async (from, to) => {
      let query = supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (filters.periodStart)
        query = query.gte("sale_date", filters.periodStart);
      if (filters.periodEnd) query = query.lte("sale_date", filters.periodEnd);
      if (filters.businessId)
        query = query.eq("business_id", filters.businessId);
      return query.returns<SaleRow[]>();
    }),
    supabase
      .from("customers")
      .select("id, name")
      .returns<{ id: string; name: string }[]>(),
  ]);

  if (customers.error)
    throw new Error("Não foi possível carregar os clientes.");

  const customerNameById = new Map(
    (customers.data ?? []).map((c) => [c.id, c.name]),
  );

  const sales = saleRows.map(mapSaleRow);

  const headers = [
    "data",
    "cliente",
    "status",
    "subtotal",
    "desconto",
    "receita",
    "custo",
    "taxa",
    "lucro_gerencial",
    "margem_percent",
    "forma_pagamento",
    "observacao",
  ];

  const rows = sales.map((s) => {
    const grossProfitCents = computeGrossProfitCents(
      s.netAmountCents,
      s.directCostsCents,
    );
    const marginPercent = computeMarginPercent(
      grossProfitCents,
      s.netAmountCents,
    );

    return [
      s.saleDate,
      s.customerId ? (customerNameById.get(s.customerId) ?? "") : "",
      STATUS_LABEL[s.status] ?? s.status,
      centsToDecimalString(s.grossAmountCents),
      centsToDecimalString(s.discountAmountCents),
      centsToDecimalString(s.netAmountCents),
      centsToDecimalString(s.directCostsCents),
      centsToDecimalString(s.feesCents),
      centsToDecimalString(grossProfitCents),
      marginPercent === null ? "" : marginPercent.toFixed(2),
      s.paymentMethod ?? "",
      s.notes ?? "",
    ];
  });

  return toCsv(headers, rows);
}
