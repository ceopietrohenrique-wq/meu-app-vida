import { z } from "zod";

export const weeklyReviewAnswersSchema = z.object({
  whatWorked: z.string().trim().max(1000).optional(),
  whatDidntWork: z.string().trim().max(1000).optional(),
  improvement: z.string().trim().max(1000).optional(),
  nextWeekPriority: z.string().trim().max(1000).optional(),
});

export type WeeklyReviewAnswersInput = z.output<
  typeof weeklyReviewAnswersSchema
>;
