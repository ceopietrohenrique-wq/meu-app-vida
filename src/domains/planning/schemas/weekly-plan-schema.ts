import { z } from "zod";

export const weeklyPlanSchema = z.object({
  topPriorities: z
    .array(z.string().trim().min(1).max(140))
    .max(3, "No máximo 3 prioridades por semana."),
  plannedWorkouts: z.coerce.number().int().min(0).max(14).optional(),
  weeklyXpGoal: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type WeeklyPlanInput = z.output<typeof weeklyPlanSchema>;
export type WeeklyPlanFormValues = z.input<typeof weeklyPlanSchema>;
