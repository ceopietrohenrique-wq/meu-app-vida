"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useWeightGoal } from "../queries/use-weight-goal";
import { useWeightLogs } from "../queries/use-weight-logs";
import { computeWeightTrend } from "../utils/weight-trend";
import { LogWeightDialog } from "./log-weight-dialog";
import { WeightGoalDialog } from "./weight-goal-dialog";

// Fase 8 > Performance: Recharts é uma dependência pesada só usada aqui —
// carregada sob demanda (nunca no bundle inicial da rota) e nunca no
// server (o gráfico não tem nada a ganhar de SSR, e Recharts depende de
// medir o DOM no client).
const WeightTrendChart = dynamic(
  () => import("./weight-trend-chart").then((mod) => mod.WeightTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

const TREND_LABEL: Record<string, string> = {
  subindo: "Subindo",
  descendo: "Descendo",
  estavel: "Estável",
};

export function WeightCard({ today }: { today: string }) {
  const { data: logs, isLoading: isLoadingLogs } = useWeightLogs(today);
  const { data: goal, isLoading: isLoadingGoal } = useWeightGoal();

  const isLoading = isLoadingLogs || isLoadingGoal;
  const trend = logs ? computeWeightTrend(logs) : null;

  return (
    <Card id="peso">
      <CardHeader>
        <CardTitle>Peso</CardTitle>
        <CardDescription>
          Histórico e tendência — nunca leve muito a sério a variação de um
          único dia.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Peso atual</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {trend ? `${trend.latestWeightKg} kg` : "—"}
                </p>
                {trend?.direction && trend.direction !== "estavel" && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    {trend.direction === "subindo" ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {TREND_LABEL[trend.direction]}
                  </p>
                )}
                {trend?.direction === "estavel" && (
                  <p className="text-muted-foreground text-xs">Estável</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Meta</p>
                <p className="text-lg font-medium tabular-nums">
                  {goal ? `${goal.targetWeightKg} kg` : "Sem meta"}
                </p>
              </div>
            </div>

            <WeightTrendChart logs={logs ?? []} />

            <div className="flex gap-2">
              <LogWeightDialog today={today} />
              <WeightGoalDialog goal={goal ?? null} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
