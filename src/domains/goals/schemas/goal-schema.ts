import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

/**
 * Escopo da Fase 6: só metas trimestrais (CLAUDE.md > Fase 6). Semanal/
 * mensal/anual/personalizada já existem como `type` válido no banco (Fase
 * 1) mas não têm interface própria ainda — ficam para quando o produto
 * precisar delas.
 */
export const createQuarterlyGoalSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(160),
  kind: z.enum(["resultado", "processo"]),
  periodStart: z.string().trim().min(1, "Selecione o início do trimestre."),
  periodEnd: z.string().trim().min(1, "Selecione o fim do trimestre."),
  targetValue: optionalCoercedNumber(z.number()),
});

export type CreateQuarterlyGoalInput = z.output<
  typeof createQuarterlyGoalSchema
>;
export type CreateQuarterlyGoalFormValues = z.input<
  typeof createQuarterlyGoalSchema
>;

export const updateGoalProgressSchema = z.object({
  goalId: z.string().trim().min(1),
  currentValue: optionalCoercedNumber(z.number()),
});

export type UpdateGoalProgressInput = z.output<typeof updateGoalProgressSchema>;
