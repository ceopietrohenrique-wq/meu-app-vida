"use client";

import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useWeeklyXpSummary } from "../queries/use-weekly-xp-summary";
import { computeLevel } from "../utils/level";
import { computeWeeklyProgressPercent } from "../utils/weekly-progress";

export function XpHeader() {
  const { data: summary, isLoading } = useWeeklyXpSummary();

  if (isLoading || !summary) {
    return <Skeleton className="h-16 w-full" />;
  }

  const level = computeLevel(summary.totalXp);
  const percent = computeWeeklyProgressPercent(
    summary.weeklyXp,
    summary.weeklyGoal,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Nível {level}</span>
        <span className="text-muted-foreground text-sm">
          {summary.weeklyXp} / {summary.weeklyGoal} XP
        </span>
      </div>
      <Progress value={percent} />
      <span className="text-muted-foreground text-xs">
        {percent}% da meta semanal
      </span>
    </div>
  );
}
