import { z } from "zod";

export const createReadingPlanSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para o plano.").max(120),
  startDate: z.string().trim().min(1, "Selecione a data de início."),
  totalDays: z.coerce
    .number()
    .int()
    .gt(0, "Informe a quantidade de dias.")
    .lte(3650, "Informe um total de dias razoável."),
});

export type CreateReadingPlanInput = z.output<typeof createReadingPlanSchema>;
export type CreateReadingPlanFormValues = z.input<
  typeof createReadingPlanSchema
>;
