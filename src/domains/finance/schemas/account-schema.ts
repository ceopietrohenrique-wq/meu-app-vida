import { z } from "zod";

import { optionalMoneyInput } from "./money-input";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  type: z.enum([
    "carteira",
    "conta_bancaria",
    "cartao",
    "caixa_empresa",
    "outra",
  ]),
  initialBalance: optionalMoneyInput,
  context: z.enum(["pessoal", "empresarial"]),
});

export type CreateAccountInput = z.output<typeof createAccountSchema>;
export type CreateAccountFormValues = z.input<typeof createAccountSchema>;
