import type { BmiCategory } from "../utils/bmi";

export type BmiRecord = {
  id: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  category: BmiCategory;
  createdAt: string;
};

export type BmiRecordRow = {
  id: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  category: string;
  created_at: string;
};

export function mapBmiRecordRow(row: BmiRecordRow): BmiRecord {
  return {
    id: row.id,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    bmi: row.bmi,
    category: row.category as BmiCategory,
    createdAt: row.created_at,
  };
}
