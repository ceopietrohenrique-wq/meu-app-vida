import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  segment: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateBusinessInput = z.output<typeof createBusinessSchema>;
export type CreateBusinessFormValues = z.input<typeof createBusinessSchema>;
