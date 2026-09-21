"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useRecentSessions } from "../queries/use-recent-sessions";

export function WorkoutHistoryCard({
  weekStartDate,
}: {
  weekStartDate: string;
}) {
  const { data: sessions, isLoading } = useRecentSessions();

  const completedThisWeek = (sessions ?? []).filter(
    (s) => s.completedAt && s.date >= weekStartDate,
  ).length;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Treinos da semana</CardTitle>
        <CardDescription>
          Sessões concluídas desde {weekStartDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            {completedThisWeek}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
