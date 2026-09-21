"use client";

import { WeeklyPlanForm } from "@/domains/planning/components/weekly-plan-form";
import { useWeeklyPlan } from "@/domains/planning/queries/use-weekly-plan";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { getWeekStartDate } from "@/shared/lib/date/week";

export default function PlanningPage() {
  const { data: profile, isLoading: isLoadingProfile } = useProfile();

  if (isLoadingProfile || !profile) {
    return <Skeleton className="h-64 w-full max-w-md" />;
  }

  const today = todayLocalDateString(profile.timezone);
  const weekStart = getWeekStartDate(today, profile.weekStart);

  return (
    <WeeklyPlanPageContent
      weekStart={weekStart}
      defaultWeeklyXpGoal={profile.weeklyXpGoal}
    />
  );
}

function WeeklyPlanPageContent({
  weekStart,
  defaultWeeklyXpGoal,
}: {
  weekStart: string;
  defaultWeeklyXpGoal: number;
}) {
  const { data: plan, isLoading } = useWeeklyPlan(weekStart);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Planejamento semanal
        </h1>
        <p className="text-muted-foreground text-sm">
          Semana de{" "}
          {new Date(`${weekStart}T00:00:00`).toLocaleDateString("pt-BR")}
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <WeeklyPlanForm
          key={plan?.id ?? weekStart}
          weekStart={weekStart}
          existingPlan={plan ?? null}
          defaultWeeklyXpGoal={defaultWeeklyXpGoal}
        />
      )}
    </div>
  );
}
