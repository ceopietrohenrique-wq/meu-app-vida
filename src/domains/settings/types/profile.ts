export type Profile = {
  id: string;
  name: string | null;
  timezone: string;
  weekStart: number;
  currency: string;
  weeklyXpGoal: number;
  heightCm: number | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Formato bruto (snake_case) como a linha existe no Postgres. */
export type ProfileRow = {
  id: string;
  name: string | null;
  timezone: string;
  week_start: number;
  currency: string;
  weekly_xp_goal: number;
  height_cm: number | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    weekStart: row.week_start,
    currency: row.currency,
    weeklyXpGoal: row.weekly_xp_goal,
    heightCm: row.height_cm,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
