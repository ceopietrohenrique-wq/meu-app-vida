import { z } from "zod";

import { parseMoneyToCents } from "@/shared/lib/money";

/**
 * Valor monetário digitado em formulário, sempre validado como STRING
 * decimal (`step="0.01"` no <input>) e convertido para centavos via
 * parseMoneyToCents — nunca via `Number(value) * 100`, que reintroduziria
 * erro de ponto flutuante na fronteira UI → banco (CLAUDE.md > Fase 4 > 1).
 */
export const requiredMoneyInput = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido (ex.: 20.00).")
  .transform(parseMoneyToCents)
  .refine((cents) => cents > 0, "Informe um valor maior que 0.");

export const optionalMoneyInput = z.preprocess(
  (value) => (value === "" || value == null ? "0" : value),
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido (ex.: 20.00).")
    .transform(parseMoneyToCents),
);
