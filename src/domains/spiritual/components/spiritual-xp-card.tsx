"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useSpiritualXpSummary } from "../queries/use-spiritual-xp-summary";

export function SpiritualXpCard() {
  const { data, isLoading } = useSpiritualXpSummary();

  if (isLoading) return <Skeleton className="h-8 w-40" />;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">
        +{data?.weeklySpiritualXp ?? 0} XP espiritual esta semana
      </Badge>
    </div>
  );
}
