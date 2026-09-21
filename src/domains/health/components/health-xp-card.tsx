"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useHealthXpSummary } from "../queries/use-health-xp-summary";

export function HealthXpCard() {
  const { data, isLoading } = useHealthXpSummary();

  if (isLoading) return <Skeleton className="h-8 w-40" />;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">
        +{data?.weeklyHealthXp ?? 0} XP de saúde esta semana
      </Badge>
    </div>
  );
}
