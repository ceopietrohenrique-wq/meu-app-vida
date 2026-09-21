import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80),
  context: z.enum(["pessoal", "empresarial"]),
});

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type CreateCategoryFormValues = z.input<typeof createCategorySchema>;
