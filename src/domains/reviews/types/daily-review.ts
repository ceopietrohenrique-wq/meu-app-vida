export type DailyReviewSnapshot = {
  tasksTotal: number;
  tasksCompleted: number;
  xpEarned: number;
};

export type DailyReviewSnapshotRow = {
  tasks_total: number;
  tasks_completed: number;
  xp_earned: number;
};

export type DailyReview = DailyReviewSnapshot & {
  id: string;
  date: string;
  carryOverNote: string | null;
};

export type DailyReviewRow = {
  id: string;
  date: string;
  tasks_total: number;
  tasks_completed: number;
  xp_earned: number;
  carry_over_note: string | null;
};

export function mapDailyReviewRow(row: DailyReviewRow): DailyReview {
  return {
    id: row.id,
    date: row.date,
    tasksTotal: row.tasks_total,
    tasksCompleted: row.tasks_completed,
    xpEarned: row.xp_earned,
    carryOverNote: row.carry_over_note,
  };
}
