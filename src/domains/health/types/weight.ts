export type WeightLog = {
  id: string;
  weightKg: number;
  date: string;
  notes: string | null;
  createdAt: string;
};

export type WeightLogRow = {
  id: string;
  weight_kg: number;
  date: string;
  notes: string | null;
  created_at: string;
};

export function mapWeightLogRow(row: WeightLogRow): WeightLog {
  return {
    id: row.id,
    weightKg: row.weight_kg,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export type WeightGoal = {
  id: string;
  targetWeightKg: number;
  targetDate: string | null;
  isActive: boolean;
  createdAt: string;
};

export type WeightGoalRow = {
  id: string;
  target_weight_kg: number;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
};

export function mapWeightGoalRow(row: WeightGoalRow): WeightGoal {
  return {
    id: row.id,
    targetWeightKg: row.target_weight_kg,
    targetDate: row.target_date,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
