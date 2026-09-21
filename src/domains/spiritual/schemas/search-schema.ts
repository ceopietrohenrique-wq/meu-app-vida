import { z } from "zod";

export const spiritualSearchSchema = z.object({
  book: z.string().trim().optional(),
  chapter: z.coerce.number().int().gt(0).optional(),
  verse: z.coerce.number().int().gt(0).optional(),
  word: z.string().trim().optional(),
  tag: z.string().trim().optional(),
});

export type SpiritualSearchInput = z.output<typeof spiritualSearchSchema>;
export type SpiritualSearchFormValues = z.input<typeof spiritualSearchSchema>;
