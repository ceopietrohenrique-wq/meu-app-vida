import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const createSavedVerseSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .min(1, "Informe a referência (ex.: João 3:16)."),
    book: z.string().trim().min(1, "Informe o livro."),
    chapter: z.coerce.number().int().gt(0, "Informe o capítulo."),
    verseStart: z.coerce.number().int().gt(0, "Informe o versículo inicial."),
    verseEnd: optionalCoercedNumber(z.coerce.number().int().gt(0)),
    notes: z.string().trim().max(2000).optional(),
    tags: z.string().trim().max(300).optional(),
  })
  .refine((data) => data.verseEnd == null || data.verseEnd >= data.verseStart, {
    message: "O versículo final não pode ser menor que o inicial.",
    path: ["verseEnd"],
  });

export type CreateSavedVerseInput = z.output<typeof createSavedVerseSchema>;
export type CreateSavedVerseFormValues = z.input<typeof createSavedVerseSchema>;
