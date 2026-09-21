import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Dê um título para a tarefa.").max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  dueDate: z.string().trim().min(1).optional(),
  estimatedMinutes: z.coerce.number().int().positive().optional(),
  xpReward: z.coerce.number().int().min(0).max(500).default(10),
});

export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type CreateTaskFormValues = z.input<typeof createTaskSchema>;
