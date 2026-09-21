"use client";

import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useCancelTransaction } from "../mutations/use-transaction-mutations";
import { useAccounts } from "../queries/use-accounts";
import { useCategories } from "../queries/use-categories";
import { useTransactions } from "../queries/use-transactions";
import type { FinanceViewContext } from "./finance-context-toggle";
import { QuickAddTransactionDialog } from "./quick-add-transaction-dialog";

const TYPE_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Gasto",
  transfer: "Transferência",
};

const TYPE_SIGN: Record<string, string> = {
  income: "+",
  expense: "-",
  transfer: "↔",
};

export function TransactionsListCard({
  today,
  viewContext,
  periodStart,
  periodEnd,
}: {
  today: string;
  viewContext: FinanceViewContext;
  periodStart: string;
  periodEnd: string;
}) {
  const filters =
    viewContext === "consolidado"
      ? { periodStart, periodEnd }
      : { periodStart, periodEnd, context: viewContext };

  const { data: transactions = [], isLoading } = useTransactions(filters);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const cancelTransaction = useCancelTransaction();

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "—";
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "—") : null;

  async function handleCancel(transactionId: string) {
    try {
      await cancelTransaction.mutateAsync(transactionId);
      toast.success("Transação cancelada.");
    } catch {
      toast.error("Não foi possível cancelar a transação.");
    }
  }

  return (
    <Card id="transacoes">
      <CardHeader>
        <CardTitle>Transações</CardTitle>
        <CardDescription>Do período selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma transação neste período.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                data-canceled={tx.canceledAt !== null}
              >
                <div className={tx.canceledAt ? "line-through opacity-50" : ""}>
                  <p className="text-sm font-medium">
                    {tx.description || TYPE_LABEL[tx.type]}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tx.transactionDate} · {accountName(tx.accountId)}
                    {categoryName(tx.categoryId)
                      ? ` · ${categoryName(tx.categoryId)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      tx.canceledAt ? "line-through opacity-50" : ""
                    }`}
                  >
                    {TYPE_SIGN[tx.type]} {formatCurrencyBRL(tx.amountCents)}
                  </p>
                  {!tx.canceledAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(tx.id)}
                      disabled={cancelTransaction.isPending}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <QuickAddTransactionDialog today={today} viewContext={viewContext} />
      </CardContent>
    </Card>
  );
}
