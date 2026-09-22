export type CustomerStage =
  | "possivel_cliente"
  | "contato_feito"
  | "interessado"
  | "proposta_enviada"
  | "negociacao"
  | "fechado"
  | "perdido";

export type Customer = {
  id: string;
  businessId: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  segment: string | null;
  city: string | null;
  notes: string | null;
  stage: CustomerStage;
  nextAction: string | null;
  nextActionDate: string | null;
  nextActionTime: string | null;
  nextActionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRow = {
  id: string;
  business_id: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  segment: string | null;
  city: string | null;
  notes: string | null;
  stage: CustomerStage;
  next_action: string | null;
  next_action_date: string | null;
  next_action_time: string | null;
  next_action_notes: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    email: row.email,
    segment: row.segment,
    city: row.city,
    notes: row.notes,
    stage: row.stage,
    nextAction: row.next_action,
    nextActionDate: row.next_action_date,
    nextActionTime: row.next_action_time,
    nextActionNotes: row.next_action_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
