"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useXpTrend } from "../queries/use-xp-trend";

export function XpTrendChart({
  periodStart,
  periodEnd,
}: {
  periodStart: string;
  periodEnd: string;
}) {
  const { data: points = [], isLoading } = useXpTrend(periodStart, periodEnd);

  return (
    <Card id="tendencia-xp">
      <CardHeader>
        <CardTitle>Tendência de XP</CardTitle>
        <CardDescription>XP ganho por dia no período.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : points.length < 2 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Sem XP suficiente neste período para mostrar tendência.
          </p>
        ) : (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points.map((p) => ({
                  ...p,
                  label: format(parseISO(p.date), "d MMM", { locale: ptBR }),
                }))}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis hide domain={[0, "dataMax + 10"]} />
                <Tooltip
                  formatter={(value) => [`${value} XP`, "XP"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="xpAmount"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
