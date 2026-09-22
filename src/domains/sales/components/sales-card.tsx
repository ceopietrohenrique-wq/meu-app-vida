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

import { useUpdateSaleStatus } from "../mutations/use-sale-mutations";
import { useSales } from "../queries/use-sales";
import type { SaleStatus } from "../types/sale";
import { CreateSaleDialog } from "./create-sale-dialog";

const STATUS_LABEL: Record<SaleStatus, string> = {
  draft: "Rascunho",
  negotiating: "Em negociação",
  confirmed: "Confirmada",
  paid: "Paga",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

// Próximo status sugerido no fluxo normal (não a única transição possível).
const NEXT_STATUS: Partial<Record<SaleStatus, SaleStatus>> = {
  draft: "confirmed",
  negotiating: "confirmed",
  confirmed: "paid",
  paid: "delivered",
};

export function SalesCard({
  businessId,
  today,
  periodStart,
  periodEnd,
}: {
  businessId: string | null;
  today: string;
  periodStart: string;
  periodEnd: string;
}) {
  const { data: sales = [], isLoading } = useSales({
    periodStart,
    periodEnd,
    businessId: businessId ?? undefined,
  });
  const updateStatus = useUpdateSaleStatus();

  async function handleAdvance(saleId: string, newStatus: SaleStatus) {
    try {
      await updateStatus.mutateAsync({
        saleId,
        newStatus,
        clientRequestId: crypto.randomUUID(),
      });
      toast.success(
        `Venda marcada como ${STATUS_LABEL[newStatus].toLowerCase()}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a venda.",
      );
    }
  }

  async function handleCancel(saleId: string) {
    try {
      await updateStatus.mutateAsync({
        saleId,
        newStatus: "cancelled",
        clientRequestId: crypto.randomUUID(),
      });
      toast.success("Venda cancelada.");
    } catch {
      toast.error("Não foi possível cancelar a venda.");
    }
  }

  return (
    <Card id="vendas">
      <CardHeader>
        <CardTitle>Vendas</CardTitle>
        <CardDescription>Do período selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : sales.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma venda neste período.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sales.map((sale) => {
              const next = NEXT_STATUS[sale.status];
              const canCancel = !["cancelled", "refunded"].includes(
                sale.status,
              );
              return (
                <li
                  key={sale.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{sale.saleDate}</p>
                      <p className="text-muted-foreground text-xs">
                        {STATUS_LABEL[sale.status]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrencyBRL(sale.netAmountCents)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {next && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => handleAdvance(sale.id, next)}
                      >
                        Marcar como {STATUS_LABEL[next].toLowerCase()}
                      </Button>
                    )}
                    {sale.status === "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => handleAdvance(sale.id, "refunded")}
                      >
                        Reembolsar
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateStatus.isPending}
                        onClick={() => handleCancel(sale.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <CreateSaleDialog businessId={businessId} today={today} />
      </CardContent>
    </Card>
  );
}
