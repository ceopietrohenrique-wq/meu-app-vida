import { z } from "zod";

export const createHabitSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome para o hábito.").max(120),
    frequency: z.enum(["diaria", "dias_da_semana"]),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    xpReward: z.coerce.number().int().min(0).max(500).default(10),
  })
  .refine(
    (data) => data.frequency === "diaria" || (data.daysOfWeek?.length ?? 0) > 0,
    {
      message: "Escolha ao menos um dia da semana.",
      path: ["daysOfWeek"],
    },
  );

export type CreateHabitInput = z.output<typeof createHabitSchema>;
export type CreateHabitFormValues = z.input<typeof createHabitSchema>;
