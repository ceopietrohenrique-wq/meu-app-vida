export type InteractionType =
  | "ligacao"
  | "whatsapp"
  | "instagram"
  | "visita"
  | "email"
  | "proposta"
  | "nota";

export type CustomerInteraction = {
  id: string;
  customerId: string;
  type: InteractionType;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
};

export type CustomerInteractionRow = {
  id: string;
  customer_id: string;
  type: InteractionType;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

export function mapCustomerInteractionRow(
  row: CustomerInteractionRow,
): CustomerInteraction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    notes: row.notes,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}
