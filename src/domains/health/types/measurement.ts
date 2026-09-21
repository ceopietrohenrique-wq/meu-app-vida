export type BodyMeasurement = {
  id: string;
  date: string;
  waistCm: number | null;
  hipCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  notes: string | null;
  createdAt: string;
};

export type BodyMeasurementRow = {
  id: string;
  date: string;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  created_at: string;
};

export function mapBodyMeasurementRow(
  row: BodyMeasurementRow,
): BodyMeasurement {
  return {
    id: row.id,
    date: row.date,
    waistCm: row.waist_cm,
    hipCm: row.hip_cm,
    chestCm: row.chest_cm,
    armCm: row.arm_cm,
    thighCm: row.thigh_cm,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
