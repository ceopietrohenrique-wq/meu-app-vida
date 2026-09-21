export type ReadingPlan = {
  id: string;
  name: string;
  startDate: string;
  totalDays: number;
  source: "custom" | "predefined";
  templateKey: string | null;
  isActive: boolean;
};

export type ReadingPlanRow = {
  id: string;
  name: string;
  start_date: string;
  total_days: number;
  source: "custom" | "predefined";
  template_key: string | null;
  is_active: boolean;
};

export function mapReadingPlanRow(row: ReadingPlanRow): ReadingPlan {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    totalDays: row.total_days,
    source: row.source,
    templateKey: row.template_key,
    isActive: row.is_active,
  };
}

export type ReadingPlanLog = {
  id: string;
  readingPlanId: string;
  dayNumber: number;
  date: string;
  notes: string | null;
};

export type ReadingPlanLogRow = {
  id: string;
  reading_plan_id: string;
  day_number: number;
  date: string;
  notes: string | null;
};

export function mapReadingPlanLogRow(row: ReadingPlanLogRow): ReadingPlanLog {
  return {
    id: row.id,
    readingPlanId: row.reading_plan_id,
    dayNumber: row.day_number,
    date: row.date,
    notes: row.notes,
  };
}
