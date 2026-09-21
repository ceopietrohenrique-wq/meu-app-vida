import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(120),
  timezone: z.string().trim().min(1, "Selecione um fuso horário."),
  weekStart: z.coerce.number().int().min(0).max(6),
  currency: z.string().trim().length(3, "Use o código de 3 letras (ex.: BRL)."),
  weeklyXpGoal: z.coerce
    .number()
    .int()
    .min(0, "A meta semanal de XP não pode ser negativa."),
});

export type UpdateProfileInput = z.output<typeof updateProfileSchema>;
export type UpdateProfileFormValues = z.input<typeof updateProfileSchema>;
