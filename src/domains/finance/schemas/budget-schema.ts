import { z } from "zod";

import { requiredMoneyInput } from "./money-input";

/**
 * "80,90,100" → [80, 90, 100]. Thresholds configuráveis por orçamento
 * (CLAUDE.md > Fase 4 > 8: 80/90/100 é só o padrão sugerido, não fixo).
 * Vazio cai no default do banco (`alert_thresholds` já nasce `{80,90,100}`).
 */
export const alertThresholdsInput = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z
    .string()
    .trim()
    .regex(
      /^\d+(\s*,\s*\d+)*$/,
      "Use números separados por vírgula (ex.: 80,90,100).",
    )
    .transform((value) => value.split(",").map((v) => Number(v.trim())))
    .refine(
      (values) => values.every((v) => v >= 1 && v <= 500),
      "Cada percentual deve estar entre 1 e 500.",
    )
    .optional(),
);

export const createBudgetSchema = z.object({
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  context: z.enum(["pessoal", "empresarial"]),
  periodMonth: z.string().trim().min(1, "Selecione o mês (ex.: 2026-03)."),
  plannedAmount: requiredMoneyInput,
  alertThresholds: alertThresholdsInput,
});

export type CreateBudgetInput = z.output<typeof createBudgetSchema>;
export type CreateBudgetFormValues = z.input<typeof createBudgetSchema>;
