import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const createMealPlanSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a refeição.").max(120),
  time: z.string().trim().optional(),
  items: z.string().trim().max(500).optional(),
  calories: optionalCoercedNumber(z.coerce.number().min(0)),
  proteinG: optionalCoercedNumber(z.coerce.number().min(0)),
  carbsG: optionalCoercedNumber(z.coerce.number().min(0)),
  fatG: optionalCoercedNumber(z.coerce.number().min(0)),
  notes: z.string().trim().max(500).optional(),
});

export type CreateMealPlanInput = z.output<typeof createMealPlanSchema>;
export type CreateMealPlanFormValues = z.input<typeof createMealPlanSchema>;

export const setMealLogStatusSchema = z.object({
  mealPlanId: z.string().uuid(),
  date: z.string().trim().min(1),
  status: z.enum(["realizada", "parcial", "nao_realizada"]),
});

export type SetMealLogStatusInput = z.output<typeof setMealLogStatusSchema>;
