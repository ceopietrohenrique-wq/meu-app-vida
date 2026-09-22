import { z } from "zod";

export const createRewardSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  description: z.string().trim().max(300).optional(),
  xpCost: z.coerce.number().int().gt(0, "Informe um custo em XP maior que 0."),
});

export type CreateRewardInput = z.output<typeof createRewardSchema>;
export type CreateRewardFormValues = z.input<typeof createRewardSchema>;
