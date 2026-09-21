import { z } from "zod";

export const createPrayerSchema = z.object({
  type: z.enum(["pedido", "agradecimento", "respondida"]),
  description: z.string().trim().min(1, "Descreva a oração.").max(2000),
  requestedAt: z.string().trim().min(1, "Selecione a data."),
  notes: z.string().trim().max(1000).optional(),
});

export type CreatePrayerInput = z.output<typeof createPrayerSchema>;
export type CreatePrayerFormValues = z.input<typeof createPrayerSchema>;

export const markPrayerAnsweredSchema = z.object({
  answeredAt: z.string().trim().min(1, "Selecione a data da resposta."),
  notes: z.string().trim().max(1000).optional(),
});

export type MarkPrayerAnsweredInput = z.output<typeof markPrayerAnsweredSchema>;
export type MarkPrayerAnsweredFormValues = z.input<
  typeof markPrayerAnsweredSchema
>;
