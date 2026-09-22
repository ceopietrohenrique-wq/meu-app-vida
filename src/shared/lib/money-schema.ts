import { z } from "zod";

import { parseMoneyToCents } from "@/shared/lib/money";

/**
 * Valor monetário digitado em formulário, sempre validado como STRING
 * decimal (`step="0.01"` no <input>) e convertido para centavos via
 * parseMoneyToCents — nunca via `Number(value) * 100`, que reintroduziria
 * erro de ponto flutuante na fronteira UI → banco. Promovido de
 * `domains/finance/schemas/money-input.ts` para `shared/lib` na Fase 5
 * quando um segundo domínio (catalog/offers/sales) passou a precisar da
 * mesma validação — mesmo padrão de `shared/lib/streak.ts` na Fase 3.
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

/**
 * Como `optionalMoneyInput`, mas vazio vira `undefined` em vez de `0` — para
 * campos onde "não preenchido" tem um significado diferente de "zero" (ex.:
 * preço unitário de item de venda vazio = usa o preço padrão do catálogo,
 * nunca vira item gratuito).
 */
export const optionalMoneyInputOrUndefined = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido (ex.: 20.00).")
    .transform(parseMoneyToCents)
    .optional(),
);
