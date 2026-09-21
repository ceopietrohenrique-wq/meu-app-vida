import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const logDevotionalSchema = z.object({
  date: z.string().trim().min(1, "Selecione a data."),
  passage: z.string().trim().max(200).optional(),
  theme: z.string().trim().max(200).optional(),
  reflection: z.string().trim().max(5000).optional(),
  learning: z.string().trim().max(5000).optional(),
  application: z.string().trim().max(5000).optional(),
  prayer: z.string().trim().max(5000).optional(),
  durationMinutes: optionalCoercedNumber(z.coerce.number().int().gt(0)),
  notes: z.string().trim().max(2000).optional(),
  readDone: z.boolean().default(false),
  reflectionDone: z.boolean().default(false),
  prayerDone: z.boolean().default(false),
});

export type LogDevotionalInput = z.output<typeof logDevotionalSchema>;
export type LogDevotionalFormValues = z.input<typeof logDevotionalSchema>;
