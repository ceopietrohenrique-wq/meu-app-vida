import { z } from "zod";

export const logWaterSchema = z.object({
  amountMl: z.coerce
    .number()
    .int()
    .gt(0, "Informe uma quantidade maior que 0.")
    .lte(5000, "Informe uma quantidade de até 5000 ml."),
  date: z.string().trim().min(1),
});

export type LogWaterInput = z.output<typeof logWaterSchema>;

export const setWaterGoalSchema = z.object({
  dailyGoalMl: z.coerce
    .number()
    .int()
    .gt(0, "Informe uma meta maior que 0.")
    .lte(10000, "Informe uma meta de até 10000 ml."),
});

export type SetWaterGoalInput = z.output<typeof setWaterGoalSchema>;
export type SetWaterGoalFormValues = z.input<typeof setWaterGoalSchema>;
