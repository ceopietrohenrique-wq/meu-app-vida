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

import { useAccounts } from "../queries/use-accounts";
import { useTransactions } from "../queries/use-transactions";
import type { FinanceViewContext } from "./finance-context-toggle";

const TYPE_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
};

/**
 * "Contas próximas" (CLAUDE.md > Fase 4 > 9): reaproveita as transações já
 * geradas pelas recorrências (generate_finance_recurrence_occurrences) —
 * nenhum sistema paralelo de "previsão". Só mostra o que já existe como
 * transação futura real (transferências não entram: não são "obrigação"
 * nem "receita prevista" no sentido do card).
 */
export function UpcomingTransactionsCard({
  today,
  viewContext,
  windowEnd,
}: {
  today: string;
  viewContext: FinanceViewContext;
  windowEnd: string;
}) {
  const filters =
    viewContext === "consolidado"
      ? { periodStart: today, periodEnd: windowEnd }
      : { periodStart: today, periodEnd: windowEnd, context: viewContext };

  const { data: transactions = [], isLoading } = useTransactions(filters);
  const { data: accounts = [] } = useAccounts();

  const upcoming = transactions
    .filter(
      (t) =>
        t.canceledAt === null &&
        t.type !== "transfer" &&
        t.transactionDate > today,
    )
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <Card id="contas-proximas">
      <CardHeader>
        <CardTitle>Contas próximas</CardTitle>
        <CardDescription>
          Próximas obrigações e receitas previstas (próximos 30 dias).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : upcoming.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma conta prevista — gere as próximas ocorrências em
            Recorrências se esperava ver algo aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {tx.description || TYPE_LABEL[tx.type]}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tx.transactionDate} · {accountName(tx.accountId)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {tx.type === "income" ? "+" : "-"}{" "}
                  {formatCurrencyBRL(tx.amountCents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
