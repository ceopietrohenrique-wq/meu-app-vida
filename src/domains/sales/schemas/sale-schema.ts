import { z } from "zod";

import {
  optionalMoneyInput,
  optionalMoneyInputOrUndefined,
} from "@/shared/lib/money-schema";

export const SALE_STATUSES = [
  "draft",
  "negotiating",
  "confirmed",
  "paid",
  "delivered",
  "cancelled",
  "refunded",
] as const;

/**
 * unitPrice/discountAmount usam a mesma validação segura de dinheiro do
 * Financeiro (string decimal → centavos, nunca `Number(value) * 100`) —
 * "vazio" aqui tem semânticas diferentes por campo: unitPrice vazio = usa o
 * preço padrão do catálogo (ver create_sale RPC), discountAmount vazio = 0.
 */
export const saleItemInputSchema = z.object({
  catalogItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().gt(0),
  unitPrice: optionalMoneyInputOrUndefined,
  discountAmount: optionalMoneyInput,
});

export const createSaleSchema = z.object({
  businessId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  status: z.enum(SALE_STATUSES).default("draft"),
  fees: optionalMoneyInput,
  paymentMethod: z.string().trim().max(60).optional(),
  saleDate: z.string().trim().min(1, "Selecione a data."),
  responsible: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(saleItemInputSchema).min(1, "Adicione ao menos um item."),
});

export type CreateSaleInput = z.output<typeof createSaleSchema>;
export type CreateSaleFormValues = z.input<typeof createSaleSchema>;

export const updateSaleStatusSchema = z.object({
  saleId: z.string().trim().min(1),
  newStatus: z.enum(SALE_STATUSES),
});

export type UpdateSaleStatusInput = z.output<typeof updateSaleStatusSchema>;
