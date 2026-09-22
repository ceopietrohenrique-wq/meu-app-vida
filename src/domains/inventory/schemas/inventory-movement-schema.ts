import { z } from "zod";

export const createInventoryMovementSchema = z.object({
  catalogItemId: z.string().trim().min(1, "Selecione um item."),
  type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce
    .number()
    .int()
    .gt(0, "Informe uma quantidade maior que 0."),
  // Só usado quando type === 'ajuste' (entrada é sempre +, saída é sempre -).
  increase: z.boolean().default(true),
  notes: z.string().trim().max(300).optional(),
});

export type CreateInventoryMovementInput = z.output<
  typeof createInventoryMovementSchema
>;
export type CreateInventoryMovementFormValues = z.input<
  typeof createInventoryMovementSchema
>;

export const setMinimumQuantitySchema = z.object({
  catalogItemId: z.string().trim().min(1),
  minimumQuantity: z.coerce.number().int().min(0).optional(),
});

export type SetMinimumQuantityInput = z.output<typeof setMinimumQuantitySchema>;
