export function computeWeeklyProgressPercent(xp: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((xp / goal) * 100));
}

export function isWeeklyGoalReached(xp: number, goal: number): boolean {
  return goal > 0 && xp >= goal;
}
