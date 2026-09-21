export type Devotional = {
  id: string;
  date: string;
  passage: string | null;
  theme: string | null;
  reflection: string | null;
  learning: string | null;
  application: string | null;
  prayer: string | null;
  durationMinutes: number | null;
  notes: string | null;
  readDone: boolean;
  reflectionDone: boolean;
  prayerDone: boolean;
};

export type DevotionalRow = {
  id: string;
  date: string;
  passage: string | null;
  theme: string | null;
  reflection: string | null;
  learning: string | null;
  application: string | null;
  prayer: string | null;
  duration_minutes: number | null;
  notes: string | null;
  read_done: boolean;
  reflection_done: boolean;
  prayer_done: boolean;
};

export function mapDevotionalRow(row: DevotionalRow): Devotional {
  return {
    id: row.id,
    date: row.date,
    passage: row.passage,
    theme: row.theme,
    reflection: row.reflection,
    learning: row.learning,
    application: row.application,
    prayer: row.prayer,
    durationMinutes: row.duration_minutes,
    notes: row.notes,
    readDone: row.read_done,
    reflectionDone: row.reflection_done,
    prayerDone: row.prayer_done,
  };
}
