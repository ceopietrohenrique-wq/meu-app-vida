export type PrayerType = "pedido" | "agradecimento" | "respondida";

export type Prayer = {
  id: string;
  type: PrayerType;
  description: string;
  requestedAt: string;
  answeredAt: string | null;
  notes: string | null;
};

export type PrayerRow = {
  id: string;
  type: PrayerType;
  description: string;
  requested_at: string;
  answered_at: string | null;
  notes: string | null;
};

export function mapPrayerRow(row: PrayerRow): Prayer {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    requestedAt: row.requested_at,
    answeredAt: row.answered_at,
    notes: row.notes,
  };
}
