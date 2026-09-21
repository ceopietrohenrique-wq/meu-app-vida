import { z } from "zod";

import { requiredMoneyInput } from "./money-input";

/**
 * Registro rápido (CLAUDE.md > Fase 4 > 13): campos mínimos para lançar um
 * gasto/receita em poucos segundos no mobile. category/paymentMethod/notes
 * são opcionais de propósito.
 */
export const createTransactionSchema = z
  .object({
    accountId: z.string().trim().min(1, "Selecione uma conta."),
    type: z.enum(["income", "expense", "transfer"]),
    context: z.enum(["pessoal", "empresarial"]),
    amount: requiredMoneyInput,
    description: z.string().trim().max(200).optional(),
    categoryId: z.string().trim().optional(),
    transactionDate: z.string().trim().min(1, "Selecione a data."),
    paymentMethod: z.string().trim().max(60).optional(),
    transferAccountId: z.string().trim().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) =>
      v.type !== "transfer" ||
      (v.transferAccountId && v.transferAccountId !== v.accountId),
    {
      message: "Selecione uma conta de destino diferente da conta de origem.",
      path: ["transferAccountId"],
    },
  );

export type CreateTransactionInput = z.output<typeof createTransactionSchema>;
export type CreateTransactionFormValues = z.input<
  typeof createTransactionSchema
>;

export const cancelTransactionSchema = z.object({
  transactionId: z.string().trim().min(1),
});

export type CancelTransactionInput = z.output<typeof cancelTransactionSchema>;
