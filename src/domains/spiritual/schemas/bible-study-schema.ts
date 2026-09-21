import { z } from "zod";

import { optionalCoercedNumber } from "@/shared/lib/zod";

export const createBibleStudyNoteSchema = z
  .object({
    book: z.string().trim().min(1, "Informe o livro."),
    chapter: z.coerce.number().int().gt(0, "Informe o capítulo."),
    verseStart: optionalCoercedNumber(z.coerce.number().int().gt(0)),
    verseEnd: optionalCoercedNumber(z.coerce.number().int().gt(0)),
    title: z.string().trim().min(1, "Dê um título para a nota.").max(200),
    personalInterpretation: z.string().trim().max(5000).optional(),
    context: z.string().trim().max(5000).optional(),
    questions: z.string().trim().max(5000).optional(),
    application: z.string().trim().max(5000).optional(),
    crossReferences: z.string().trim().max(500).optional(),
    tags: z.string().trim().max(300).optional(),
  })
  .refine(
    (data) =>
      data.verseEnd == null ||
      data.verseStart == null ||
      data.verseEnd >= data.verseStart,
    {
      message: "O versículo final não pode ser menor que o inicial.",
      path: ["verseEnd"],
    },
  );

export type CreateBibleStudyNoteInput = z.output<
  typeof createBibleStudyNoteSchema
>;
export type CreateBibleStudyNoteFormValues = z.input<
  typeof createBibleStudyNoteSchema
>;
