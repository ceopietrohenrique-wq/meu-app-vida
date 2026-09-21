import { z } from "zod";

export const captureInboxItemSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Escreva alguma coisa antes de salvar.")
    .max(2000),
});

export type CaptureInboxItemInput = z.infer<typeof captureInboxItemSchema>;
