"use client";

import { addDays, format } from "date-fns";
import dynamic from "next/dynamic";
import { useState } from "react";

import { BusinessDashboardCard } from "@/domains/business/components/business-dashboard-card";
import { FinanceDashboardCard } from "@/domains/finance/components/finance-dashboard-card";
import { QuarterlyGoalsCard } from "@/domains/goals/components/quarterly-goals-card";
import {
  PROGRESS_PERIODS,
  ProgressPeriodSelector,
  type ProgressPeriodKey,
} from "@/domains/progress/components/progress-period-selector";
import { ProgressSummaryCard } from "@/domains/progress/components/progress-summary-card";
import { WeeklyReviewDialog } from "@/domains/reviews/components/weekly-review-dialog";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { AchievementsCard } from "@/domains/xp/components/achievements-card";
import { RewardsCard } from "@/domains/xp/components/rewards-card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  parseLocalDateOnly,
  todayLocalDateString,
} from "@/shared/lib/date/local-date";
import { getWeekStartDate } from "@/shared/lib/date/week";

// Fase 8 > Performance: Recharts carregado sob demanda, nunca no bundle
// inicial nem no server (mesmo racional de weight-card.tsx).
const XpTrendChart = dynamic(
  () =>
    import("@/domains/progress/components/xp-trend-chart").then(
      (mod) => mod.XpTrendChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

export default function ProgressPage() {
  const { data: profile, isLoading } = useProfile();
  const [period, setPeriod] = useState<ProgressPeriodKey>("30d");

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const today = todayLocalDateString(profile.timezone);
  const todayDate = parseLocalDateOnly(today);
  const periodStart = format(
    addDays(todayDate, -PROGRESS_PERIODS[period].days + 1),
    "yyyy-MM-dd",
  );
  const periodEnd = today;
  const weekStartDate = getWeekStartDate(today, profile.weekStart);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Progresso</h1>
          <WeeklyReviewDialog weekStart={weekStartDate} />
        </div>
        <ProgressPeriodSelector value={period} onChange={setPeriod} />
      </div>

      <ProgressSummaryCard periodStart={periodStart} periodEnd={periodEnd} />
      <XpTrendChart periodStart={periodStart} periodEnd={periodEnd} />
      <FinanceDashboardCard
        viewContext="pessoal"
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
      <BusinessDashboardCard
        periodStart={periodStart}
        periodEnd={periodEnd}
        businessId={null}
      />
      <QuarterlyGoalsCard />
      <AchievementsCard />
      <RewardsCard />
    </div>
  );
}
