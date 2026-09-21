import { z } from "zod";

/**
 * `z.coerce.number().optional()` NÃO trata "" (campo numérico opcional
 * deixado em branco num <input>) como ausente — `Number("")` é `0`, então
 * `.optional()` nunca entra em ação e validações como `.gt(0)` falham
 * silenciosamente, bloqueando o submit sem nenhuma mensagem de erro visível.
 * Este helper trata "", null e undefined como "campo não preenchido" antes
 * da coerção.
 */
export function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    schema.optional(),
  );
}
