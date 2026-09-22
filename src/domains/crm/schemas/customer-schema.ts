import { z } from "zod";

export const CUSTOMER_STAGES = [
  "possivel_cliente",
  "contato_feito",
  "interessado",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
] as const;

export const createCustomerSchema = z.object({
  businessId: z.string().trim().optional(),
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(60).optional(),
  email: z.string().trim().max(160).optional(),
  segment: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  stage: z.enum(CUSTOMER_STAGES).default("possivel_cliente"),
});

export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type CreateCustomerFormValues = z.input<typeof createCustomerSchema>;

export const updateStageSchema = z.object({
  customerId: z.string().trim().min(1),
  stage: z.enum(CUSTOMER_STAGES),
});

export type UpdateStageInput = z.output<typeof updateStageSchema>;

export const setFollowUpSchema = z.object({
  customerId: z.string().trim().min(1),
  nextAction: z.string().trim().max(200).optional(),
  nextActionDate: z.string().trim().optional(),
  nextActionTime: z.string().trim().optional(),
  nextActionNotes: z.string().trim().max(500).optional(),
});

export type SetFollowUpInput = z.output<typeof setFollowUpSchema>;
export type SetFollowUpFormValues = z.input<typeof setFollowUpSchema>;
