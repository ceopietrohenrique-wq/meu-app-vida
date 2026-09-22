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

import { useBusinessDashboard } from "../queries/use-business-dashboard";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function BusinessDashboardCard({
  periodStart,
  periodEnd,
  businessId,
}: {
  periodStart: string;
  periodEnd: string;
  businessId: string | null;
}) {
  const { data, isLoading } = useBusinessDashboard(
    periodStart,
    periodEnd,
    businessId,
  );

  return (
    <Card id="dashboard-empresarial">
      <CardHeader>
        <CardTitle>Dashboard empresarial</CardTitle>
        <CardDescription>
          Lucro líquido gerencial é uma métrica de gestão — não é apuração
          contábil/fiscal oficial.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">
                  Faturamento bruto
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.grossRevenueCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Receita líquida</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.netRevenueCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Lucro bruto</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.grossProfitCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Lucro líquido gerencial
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatCurrencyBRL(data.netProfitCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Margem</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatPercent(data.marginPercent)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ROI</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatPercent(data.roiPercent)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Vendas</p>
                <p className="text-lg font-semibold tabular-nums">
                  {data.salesCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ticket médio</p>
                <p className="text-lg font-semibold tabular-nums">
                  {data.averageTicketCents === null
                    ? "—"
                    : formatCurrencyBRL(data.averageTicketCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Conversão</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatPercent(data.conversionPercent)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">
                  Produto mais vendido
                </p>
                <p>{data.topSellingItem ? data.topSellingItem.name : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Produto mais lucrativo
                </p>
                <p>
                  {data.mostProfitableItem ? data.mostProfitableItem.name : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Leads no período
                </p>
                <p>{data.leadsCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Follow-ups pendentes
                </p>
                <p>{data.pendingFollowUpsCount}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
