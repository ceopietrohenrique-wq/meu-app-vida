"use client";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export const PROGRESS_PERIODS = {
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
  "3m": { label: "3 meses", days: 90 },
  "6m": { label: "6 meses", days: 182 },
  "1y": { label: "1 ano", days: 365 },
} as const;

export type ProgressPeriodKey = keyof typeof PROGRESS_PERIODS;

/**
 * "Não colocar todos os gráficos simultaneamente. Permitir filtros."
 * (CLAUDE.md > Fase 6 > Progresso) — um único período selecionado por vez,
 * nunca todos os indicadores de todas as janelas ao mesmo tempo.
 */
export function ProgressPeriodSelector({
  value,
  onChange,
}: {
  value: ProgressPeriodKey;
  onChange: (period: ProgressPeriodKey) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ProgressPeriodKey)}>
      <TabsList>
        {Object.entries(PROGRESS_PERIODS).map(([key, { label }]) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
