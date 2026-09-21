"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

/**
 * Filtro por período do Dashboard Financeiro (CLAUDE.md > Fase 4 > gate:
 * "filtros por período"). Padrão = mês atual (`monthOffset = 0`); navega
 * mês anterior/seguinte sem exigir um seletor de intervalo customizado
 * (fora de escopo — a RPC já aceita qualquer intervalo, mas a UI só
 * precisa do essencial pedido pela spec).
 */
export function PeriodNavigator({
  referenceDate,
  monthOffset,
  onMonthOffsetChange,
}: {
  referenceDate: Date;
  monthOffset: number;
  onMonthOffsetChange: (offset: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Mês anterior"
        onClick={() => onMonthOffsetChange(monthOffset - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium capitalize">
        {MONTH_LABEL_FORMATTER.format(referenceDate)}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Próximo mês"
        onClick={() => onMonthOffsetChange(monthOffset + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
      {monthOffset !== 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onMonthOffsetChange(0)}
        >
          Mês atual
        </Button>
      )}
    </div>
  );
}
