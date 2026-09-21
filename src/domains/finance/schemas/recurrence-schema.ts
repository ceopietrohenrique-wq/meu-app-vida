import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

import { requiredMoneyInput } from "./money-input";

export const createRecurrenceSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  type: z.enum(["income", "expense"]),
  context: z.enum(["pessoal", "empresarial"]),
  accountId: z.string().trim().min(1, "Selecione uma conta."),
  categoryId: z.string().trim().optional(),
  paymentMethod: z.string().trim().max(60).optional(),
  amount: requiredMoneyInput,
  dayOfMonth: z.coerce.number().int().gte(1).lte(31),
  startsOn: z.string().trim().min(1, "Selecione a data de início."),
  endsOn: z.string().trim().optional(),
  totalInstallments: optionalCoercedNumber(z.number().int().gt(0)),
});

export type CreateRecurrenceInput = z.output<typeof createRecurrenceSchema>;
export type CreateRecurrenceFormValues = z.input<typeof createRecurrenceSchema>;
