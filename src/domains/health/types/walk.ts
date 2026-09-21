export type WalkLog = {
  id: string;
  date: string;
  durationMinutes: number;
  distanceKm: number | null;
  createdAt: string;
};

export type WalkLogRow = {
  id: string;
  date: string;
  duration_minutes: number;
  distance_km: number | null;
  created_at: string;
};

export function mapWalkLogRow(row: WalkLogRow): WalkLog {
  return {
    id: row.id,
    date: row.date,
    durationMinutes: row.duration_minutes,
    distanceKm: row.distance_km,
    createdAt: row.created_at,
  };
}
