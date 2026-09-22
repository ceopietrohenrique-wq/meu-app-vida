import { z } from "zod";

import {
  optionalMoneyInput,
  requiredMoneyInput,
} from "@/shared/lib/money-schema";

export const createCatalogItemSchema = z
  .object({
    businessId: z.string().trim().optional(),
    name: z.string().trim().min(1, "Informe um nome.").max(120),
    type: z.enum(["produto", "servico"]),
    description: z.string().trim().max(500).optional(),
    defaultPrice: requiredMoneyInput,
    defaultCost: optionalMoneyInput,
    sku: z.string().trim().max(60).optional(),
    tracksInventory: z.boolean().default(false),
    category: z.string().trim().max(80).optional(),
  })
  .refine((v) => v.type === "produto" || !v.tracksInventory, {
    message: "Só produtos podem controlar estoque.",
    path: ["tracksInventory"],
  });

export type CreateCatalogItemInput = z.output<typeof createCatalogItemSchema>;
export type CreateCatalogItemFormValues = z.input<
  typeof createCatalogItemSchema
>;
