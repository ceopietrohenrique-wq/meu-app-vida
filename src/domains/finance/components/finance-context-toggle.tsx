"use client";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import type { FinanceContext } from "../types/account";

export type FinanceViewContext = FinanceContext | "consolidado";

/**
 * Financeiro pessoal e empresarial nunca se misturam por padrão — a visão
 * consolidada só aparece quando o usuário escolhe explicitamente
 * (CLAUDE.md > Fase 4 > 4).
 */
export function FinanceContextToggle({
  value,
  onChange,
}: {
  value: FinanceViewContext;
  onChange: (value: FinanceViewContext) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as FinanceViewContext)}
    >
      <TabsList>
        <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
        <TabsTrigger value="empresarial">Empresarial</TabsTrigger>
        <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
