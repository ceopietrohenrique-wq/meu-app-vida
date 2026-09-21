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
import { CreateAccountDialog } from "./create-account-dialog";
import type { FinanceViewContext } from "./finance-context-toggle";

const TYPE_LABEL: Record<string, string> = {
  carteira: "Carteira",
  conta_bancaria: "Conta bancária",
  cartao: "Cartão",
  caixa_empresa: "Caixa da empresa",
  outra: "Outra",
};

export function AccountsCard({ context }: { context: FinanceViewContext }) {
  const { data: accounts = [], isLoading } = useAccounts();

  const visible = accounts.filter(
    (a) => context === "consolidado" || a.context === context,
  );

  return (
    <Card id="contas">
      <CardHeader>
        <CardTitle>Contas</CardTitle>
        <CardDescription>
          Carteira, conta bancária, cartão, caixa da empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma conta ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {account.name}
                    {!account.isActive && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (inativa)
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {TYPE_LABEL[account.type]} · {account.context}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrencyBRL(account.balanceCents)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <CreateAccountDialog defaultContext={context} />
      </CardContent>
    </Card>
  );
}
