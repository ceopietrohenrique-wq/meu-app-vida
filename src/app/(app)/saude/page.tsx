"use client";

import { BmiCalculatorCard } from "@/domains/health/components/bmi-calculator-card";
import { HealthXpCard } from "@/domains/health/components/health-xp-card";
import { LogMeasurementDialog } from "@/domains/health/components/log-measurement-dialog";
import { LogWalkDialog } from "@/domains/health/components/log-walk-dialog";
import { WaterTrackerCard } from "@/domains/health/components/water-tracker-card";
import { WeightCard } from "@/domains/health/components/weight-card";
import { MealPlanCard } from "@/domains/nutrition/components/meal-plan-card";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { WorkoutHistoryCard } from "@/domains/workouts/components/workout-history-card";
import { WorkoutSection } from "@/domains/workouts/components/workout-section";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { getWeekStartDate } from "@/shared/lib/date/week";

import { HealthShortcuts } from "./health-shortcuts";

export default function HealthPage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const today = todayLocalDateString(profile.timezone);
  const weekStartDate = getWeekStartDate(today, profile.weekStart);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Saúde</h1>
        <HealthXpCard />
      </div>

      <HealthShortcuts today={today} />

      <div id="caminhada" className="flex flex-wrap gap-2">
        <LogMeasurementDialog today={today} />
        <LogWalkDialog today={today} />
      </div>

      <WeightCard today={today} />
      <WaterTrackerCard today={today} />
      <MealPlanCard today={today} />
      <WorkoutHistoryCard weekStartDate={weekStartDate} />
      <WorkoutSection today={today} />
      <BmiCalculatorCard defaultHeightCm={profile.heightCm} />
    </div>
  );
}
