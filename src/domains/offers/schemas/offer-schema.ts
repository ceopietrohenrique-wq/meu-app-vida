import { z } from "zod";

import { optionalMoneyInput } from "@/shared/lib/money-schema";

export const offerItemInputSchema = z.object({
  catalogItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().gt(0),
});

export const createOfferSchema = z
  .object({
    businessId: z.string().trim().optional(),
    name: z.string().trim().min(1, "Informe um nome.").max(120),
    description: z.string().trim().max(500).optional(),
    discountType: z.enum(["percent", "fixed", ""]).optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountFixed: optionalMoneyInput,
    items: z.array(offerItemInputSchema).min(1, "Adicione ao menos um item."),
  })
  .transform((v) => ({
    businessId: v.businessId,
    name: v.name,
    description: v.description,
    items: v.items,
    discountType: v.discountType === "" ? undefined : v.discountType,
    discountPercent: v.discountPercent,
    discountFixedCents: v.discountFixed,
  }));

export type CreateOfferInput = z.output<typeof createOfferSchema>;
export type CreateOfferFormValues = z.input<typeof createOfferSchema>;
