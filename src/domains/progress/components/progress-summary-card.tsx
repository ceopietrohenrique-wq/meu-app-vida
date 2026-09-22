"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { useProgressSummary } from "../queries/use-progress-summary";

type View = "geral" | "saude" | "espiritual";

/**
 * "Não colocar todos os gráficos simultaneamente" (CLAUDE.md > Fase 6): só
 * uma aba de indicadores por vez, nunca saúde + espiritual + geral juntos.
 */
export function ProgressSummaryCard({
  periodStart,
  periodEnd,
}: {
  periodStart: string;
  periodEnd: string;
}) {
  const [view, setView] = useState<View>("geral");
  const { data, isLoading } = useProgressSummary(periodStart, periodEnd);

  return (
    <Card id="resumo-progresso">
      <CardHeader>
        <CardTitle>Resumo do período</CardTitle>
        <CardDescription>Como estou evoluindo?</CardDescription>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="saude">Saúde</TabsTrigger>
            <TabsTrigger value="espiritual">Espiritual</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-24 w-full" />
        ) : view === "geral" ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Indicator label="XP" value={data.xpTotal} />
            <Indicator
              label="Tarefas"
              value={`${data.tasksCompleted}/${data.tasksTotal}`}
            />
            <Indicator
              label="Hábitos registrados"
              value={data.habitLogsCount}
            />
          </dl>
        ) : view === "saude" ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Indicator
              label="Treinos concluídos"
              value={data.workoutsCompleted}
            />
            <Indicator
              label="Refeições aderentes"
              value={`${data.mealsAdherent}/${data.mealsPlanned}`}
            />
            <Indicator
              label="Dias com meta de água batida"
              value={data.waterGoalDays}
            />
            <Indicator label="Registros de peso" value={data.weightLogsCount} />
            {data.firstWeightKg !== null && data.latestWeightKg !== null && (
              <Indicator
                label="Peso (início → fim)"
                value={`${data.firstWeightKg} → ${data.latestWeightKg} kg`}
              />
            )}
          </dl>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Indicator
              label="Dias de devocional completo"
              value={data.devotionalDays}
            />
            <Indicator
              label="Dias de leitura bíblica"
              value={data.bibleReadingDays}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Indicator({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
