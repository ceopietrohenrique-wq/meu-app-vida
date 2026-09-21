"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useCategories } from "../queries/use-categories";
import { useTransactions } from "../queries/use-transactions";
import { useBudgets } from "../queries/use-budgets";
import { computeBudgetProgress } from "../utils/budget-progress";
import { CreateBudgetDialog } from "./create-budget-dialog";
import type { FinanceViewContext } from "./finance-context-toggle";

export function BudgetsCard({
  viewContext,
  periodMonth,
  periodStart,
  periodEnd,
}: {
  viewContext: FinanceViewContext;
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
}) {
  const { data: budgets = [], isLoading: isLoadingBudgets } =
    useBudgets(periodMonth);
  const { data: categories = [] } = useCategories();
  const filters =
    viewContext === "consolidado"
      ? { periodStart, periodEnd }
      : { periodStart, periodEnd, context: viewContext };
  const { data: transactions = [], isLoading: isLoadingTx } =
    useTransactions(filters);

  const visibleBudgets = budgets.filter(
    (b) => viewContext === "consolidado" || b.context === viewContext,
  );

  const isLoading = isLoadingBudgets || isLoadingTx;

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? "—";
  }

  function realizedCentsFor(categoryId: string) {
    return transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.categoryId === categoryId &&
          t.canceledAt === null,
      )
      .reduce((sum, t) => sum + t.amountCents, 0);
  }

  return (
    <Card id="orcamentos">
      <CardHeader>
        <CardTitle>Orçamentos</CardTitle>
        <CardDescription>
          Limite mensal por categoria, com alertas em 80/90/100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : visibleBudgets.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhum orçamento neste mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visibleBudgets.map((budget) => {
              const realizedCents = realizedCentsFor(budget.categoryId);
              const progress = computeBudgetProgress(
                budget.plannedAmountCents,
                realizedCents,
              );
              const clampedPercent = Math.min(progress.percent ?? 0, 100);

              return (
                <li key={budget.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {categoryName(budget.categoryId)}
                      {(progress.percent ?? 0) >= 100
                        ? " ⚠"
                        : (progress.percent ?? 0) >= 80
                          ? " •"
                          : ""}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrencyBRL(progress.realizedCents)} /{" "}
                      {formatCurrencyBRL(progress.plannedCents)} ·{" "}
                      {progress.percent === null
                        ? "—"
                        : `${progress.percent.toFixed(0)}%`}
                    </span>
                  </div>
                  <Progress value={clampedPercent} />
                </li>
              );
            })}
          </ul>
        )}
        <CreateBudgetDialog
          defaultContext={viewContext}
          periodMonth={periodMonth}
        />
      </CardContent>
    </Card>
  );
}
