export type HabitFrequency = "diaria" | "dias_da_semana";

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  daysOfWeek: number[] | null;
  xpReward: number;
  isActive: boolean;
  createdAt: string;
};

export type HabitRow = {
  id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  days_of_week: number[] | null;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
};

export function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    frequency: row.frequency,
    daysOfWeek: row.days_of_week,
    xpReward: row.xp_reward,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export type HabitLogRow = {
  id: string;
  habit_id: string;
  date: string;
  value: number | null;
};
