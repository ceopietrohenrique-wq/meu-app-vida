import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { CreateSaleInput } from "../schemas/sale-schema";
import {
  mapSaleItemRow,
  mapSaleRow,
  type Sale,
  type SaleItem,
  type SaleItemRow,
  type SaleRow,
} from "../types/sale";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listSales(
  supabase: SupabaseClient,
  filters: { periodStart: string; periodEnd: string; businessId?: string },
): Promise<Sale[]> {
  let query = supabase
    .from("sales")
    .select("*")
    .gte("sale_date", filters.periodStart)
    .lte("sale_date", filters.periodEnd)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.businessId) query = query.eq("business_id", filters.businessId);

  const { data, error } = await query.returns<SaleRow[]>();
  if (error) throwFriendly("Não foi possível carregar as vendas.");
  return (data ?? []).map(mapSaleRow);
}

export async function listSaleItems(
  supabase: SupabaseClient,
  saleId: string,
): Promise<SaleItem[]> {
  const { data, error } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", saleId)
    .returns<SaleItemRow[]>();

  if (error) throwFriendly("Não foi possível carregar os itens da venda.");
  return (data ?? []).map(mapSaleItemRow);
}

/**
 * clientRequestId protege contra double-submit (ver
 * docs/business-rules.md > Fase 5 > Vendas): gerado uma vez por "intenção
 * de envio" no client, nunca a cada clique.
 */
export async function createSale(
  supabase: SupabaseClient,
  input: CreateSaleInput,
  clientRequestId: string,
): Promise<Sale> {
  const { data, error } = await supabase
    .rpc("create_sale", {
      p_client_request_id: clientRequestId,
      p_items: input.items.map((item) => ({
        catalog_item_id: item.catalogItemId,
        quantity: item.quantity,
        unit_price:
          item.unitPrice === undefined
            ? null
            : centsToDecimalString(item.unitPrice),
        discount_amount: centsToDecimalString(item.discountAmount),
      })),
      p_business_id: input.businessId || null,
      p_customer_id: input.customerId || null,
      p_account_id: input.accountId || null,
      p_status: input.status,
      p_fees: centsToDecimalString(input.fees),
      p_payment_method: input.paymentMethod || null,
      p_sale_date: input.saleDate,
      p_responsible: input.responsible || null,
      p_notes: input.notes || null,
    })
    .single<SaleRow>();

  if (error) throwFriendly("Não foi possível criar a venda.");
  return mapSaleRow(data!);
}

export async function updateSaleStatus(
  supabase: SupabaseClient,
  saleId: string,
  newStatus: string,
  clientRequestId: string,
): Promise<Sale> {
  const { data, error } = await supabase
    .rpc("update_sale_status", {
      p_sale_id: saleId,
      p_new_status: newStatus,
      p_client_request_id: clientRequestId,
    })
    .single<SaleRow>();

  if (error)
    throwFriendly(
      error.message || "Não foi possível atualizar o status da venda.",
    );
  return mapSaleRow(data!);
}
