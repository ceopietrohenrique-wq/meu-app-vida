export type Business = {
  id: string;
  name: string;
  segment: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusinessRow = {
  id: string;
  name: string;
  segment: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapBusinessRow(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
