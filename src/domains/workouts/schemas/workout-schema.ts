import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

const workoutExerciseSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para o exercício."),
  muscleGroup: z.string().trim().optional(),
  plannedSets: optionalCoercedNumber(z.coerce.number().int().gt(0)),
  plannedReps: z.string().trim().optional(),
  plannedLoadKg: optionalCoercedNumber(z.coerce.number().min(0)),
  restSeconds: optionalCoercedNumber(z.coerce.number().int().min(0)),
});

export const createWorkoutPlanSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para o plano de treino.").max(120),
  muscleGroups: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
  exercises: z
    .array(workoutExerciseSchema)
    .min(1, "Adicione ao menos um exercício."),
});

export type CreateWorkoutPlanInput = z.output<typeof createWorkoutPlanSchema>;
export type CreateWorkoutPlanFormValues = z.input<
  typeof createWorkoutPlanSchema
>;

export const logExerciseSetSchema = z.object({
  workoutSessionId: z.string().uuid(),
  workoutExerciseId: z.string().uuid(),
  setOrder: z.coerce.number().int().gt(0),
  loadKg: z.coerce.number().min(0).optional(),
  reps: z.coerce.number().int().min(0).optional(),
});

export type LogExerciseSetInput = z.output<typeof logExerciseSetSchema>;
