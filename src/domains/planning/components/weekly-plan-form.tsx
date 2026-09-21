"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import { useSaveWeeklyPlan } from "../mutations/use-weekly-plan-mutations";
import type { WeeklyPlan } from "../types/weekly-plan";

/**
 * Escopo Fase 1: só prioridades da semana e meta de XP. Treinos planejados,
 * objetivo alimentar, meta comercial/financeira/espiritual pertencem a
 * Saúde/Financeiro/Negócios/Espiritual (fases futuras) — não antecipar.
 *
 * O componente é montado com `key={existingPlan?.id ?? weekStart}` pelo pai
 * (ver planejamento/page.tsx), então o estado inicial abaixo já nasce
 * correto quando o plano existente termina de carregar — sem precisar de
 * useEffect sincronizando props em state.
 */
export function WeeklyPlanForm({
  weekStart,
  existingPlan,
  defaultWeeklyXpGoal,
}: {
  weekStart: string;
  existingPlan: WeeklyPlan | null;
  defaultWeeklyXpGoal: number;
}) {
  const savePlan = useSaveWeeklyPlan(weekStart);
  const [priorities, setPriorities] = useState<string[]>(() =>
    [...(existingPlan?.topPriorities ?? []), "", "", ""].slice(0, 3),
  );
  const [weeklyXpGoal, setWeeklyXpGoal] = useState(
    existingPlan?.weeklyXpGoal ?? defaultWeeklyXpGoal,
  );
  const [notes, setNotes] = useState(existingPlan?.notes ?? "");

  async function handleSave() {
    try {
      await savePlan.mutateAsync({
        topPriorities: priorities.map((p) => p.trim()).filter(Boolean),
        weeklyXpGoal,
        notes: notes.trim() || undefined,
      });
      toast.success("Planejamento da semana salvo.");
    } catch {
      toast.error("Não foi possível salvar o planejamento.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">3 prioridades da semana</span>
        {priorities.map((value, i) => (
          <Input
            key={i}
            value={value}
            placeholder={`Prioridade ${i + 1}`}
            onChange={(e) => {
              const next = [...priorities];
              next[i] = e.target.value;
              setPriorities(next);
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="weekly-xp-goal" className="text-sm font-medium">
          Meta de XP da semana
        </label>
        <Input
          id="weekly-xp-goal"
          type="number"
          min={0}
          step={10}
          value={weeklyXpGoal}
          onChange={(e) => setWeeklyXpGoal(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Observações (opcional)
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={savePlan.isPending}
        className="self-start"
      >
        {savePlan.isPending ? "Salvando…" : "Salvar planejamento"}
      </Button>
    </div>
  );
}
