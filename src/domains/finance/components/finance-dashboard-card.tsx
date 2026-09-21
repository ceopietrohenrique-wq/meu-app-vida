"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useFinanceDashboard } from "../queries/use-finance-dashboard";
import type { FinanceViewContext } from "./finance-context-toggle";

function comparisonLabel(current: number, previous: number): string {
  if (previous === 0)
    return current === 0 ? "sem variação" : "sem dados do mês anterior";
  const deltaPercent = ((current - previous) / previous) * 100;
  const sign = deltaPercent >= 0 ? "+" : "";
  return `${sign}${deltaPercent.toFixed(0)}% vs. mês anterior`;
}

export function FinanceDashboardCard({
  viewContext,
  periodStart,
  periodEnd,
}: {
  viewContext: FinanceViewContext;
  periodStart: string;
  periodEnd: string;
}) {
  const { data, isLoading } = useFinanceDashboard(
    viewContext,
    periodStart,
    periodEnd,
  );

  return (
    <Card id="dashboard-financeiro">
      <CardHeader>
        <CardTitle>Dashboard financeiro</CardTitle>
        <CardDescription>Mês atual — {viewContext}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Entradas</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.incomeCents)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {comparisonLabel(data.incomeCents, data.previousIncomeCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saídas</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.expenseCents)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {comparisonLabel(
                    data.expenseCents,
                    data.previousExpenseCents,
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saldo</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.balanceCents)}
                </p>
              </div>
            </div>

            {data.topCategories.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs">
                  Maiores categorias de gasto
                </p>
                <ul className="flex flex-col gap-1">
                  {data.topCategories.map((c) => (
                    <li
                      key={c.categoryId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{c.categoryName}</span>
                      <span className="tabular-nums">
                        {formatCurrencyBRL(c.totalCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
