import { z } from "zod";

export const INTERACTION_TYPES = [
  "ligacao",
  "whatsapp",
  "instagram",
  "visita",
  "email",
  "proposta",
  "nota",
] as const;

export const logInteractionSchema = z.object({
  customerId: z.string().trim().min(1),
  type: z.enum(INTERACTION_TYPES),
  notes: z.string().trim().max(500).optional(),
});

export type LogInteractionInput = z.output<typeof logInteractionSchema>;
export type LogInteractionFormValues = z.input<typeof logInteractionSchema>;
