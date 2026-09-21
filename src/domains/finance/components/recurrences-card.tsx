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

import { useGenerateRecurrenceOccurrences } from "../mutations/use-recurrence-mutations";
import { useRecurrences } from "../queries/use-recurrences";
import { CreateRecurrenceDialog } from "./create-recurrence-dialog";
import type { FinanceViewContext } from "./finance-context-toggle";

const TYPE_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
};

export function RecurrencesCard({
  viewContext,
  today,
}: {
  viewContext: FinanceViewContext;
  today: string;
}) {
  const { data: recurrences = [], isLoading } = useRecurrences();
  const generate = useGenerateRecurrenceOccurrences();

  const visible = recurrences.filter(
    (r) => viewContext === "consolidado" || r.context === viewContext,
  );

  async function handleGenerate(recurrenceId: string) {
    try {
      const created = await generate.mutateAsync(recurrenceId);
      toast.success(
        created.length > 0
          ? `${created.length} nova(s) ocorrência(s) gerada(s).`
          : "Nenhuma ocorrência nova — já estava tudo gerado.",
      );
    } catch {
      toast.error("Não foi possível gerar as próximas ocorrências.");
    }
  }

  return (
    <Card id="recorrencias">
      <CardHeader>
        <CardTitle>Recorrências</CardTitle>
        <CardDescription>
          Assinaturas, parcelas e contas recorrentes — gera previsões futuras
          sem duplicar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma recorrência ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {TYPE_LABEL[r.type]} · todo dia {r.dayOfMonth} ·{" "}
                    {formatCurrencyBRL(r.amountCents)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerate(r.id)}
                  disabled={generate.isPending}
                >
                  Gerar próximas
                </Button>
              </li>
            ))}
          </ul>
        )}
        <CreateRecurrenceDialog defaultContext={viewContext} today={today} />
      </CardContent>
    </Card>
  );
}
