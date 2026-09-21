import { z } from "zod";

export const calculateBmiSchema = z.object({
  weightKg: z.coerce
    .number()
    .gt(0, "Informe um peso maior que 0.")
    .lt(500, "Informe um peso menor que 500 kg."),
  heightCm: z.coerce
    .number()
    .gt(0, "Informe uma altura maior que 0.")
    .lt(300, "Informe uma altura menor que 300 cm."),
});

export type CalculateBmiInput = z.output<typeof calculateBmiSchema>;
export type CalculateBmiFormValues = z.input<typeof calculateBmiSchema>;
