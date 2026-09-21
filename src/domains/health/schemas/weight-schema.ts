import { z } from "zod";

export const logWeightSchema = z.object({
  weightKg: z.coerce
    .number()
    .gt(0, "Informe um peso maior que 0.")
    .lt(500, "Informe um peso menor que 500 kg."),
  date: z.string().trim().min(1, "Selecione a data."),
  notes: z.string().trim().max(500).optional(),
});

export type LogWeightInput = z.output<typeof logWeightSchema>;
export type LogWeightFormValues = z.input<typeof logWeightSchema>;

export const setWeightGoalSchema = z.object({
  targetWeightKg: z.coerce
    .number()
    .gt(0, "Informe um peso maior que 0.")
    .lt(500, "Informe um peso menor que 500 kg."),
  targetDate: z.string().trim().optional(),
});

export type SetWeightGoalInput = z.output<typeof setWeightGoalSchema>;
export type SetWeightGoalFormValues = z.input<typeof setWeightGoalSchema>;
