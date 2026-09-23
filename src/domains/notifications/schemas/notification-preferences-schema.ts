import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.");

export const updateNotificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  tasksEnabled: z.boolean(),
  waterEnabled: z.boolean(),
  dietEnabled: z.boolean(),
  workoutEnabled: z.boolean(),
  weightEnabled: z.boolean(),
  spiritualEnabled: z.boolean(),
  financeEnabled: z.boolean(),
  businessEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean(),
  weeklySummaryEnabled: z.boolean(),
  dailySummaryTime: timeSchema,
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeSchema,
  quietHoursEnd: timeSchema,
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
