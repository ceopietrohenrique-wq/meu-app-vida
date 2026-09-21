"use client";

import { LogWeightDialog } from "@/domains/health/components/log-weight-dialog";
import { WaterQuickAddButtons } from "@/domains/health/components/water-quick-add-buttons";
import { QuickLogMealDialog } from "@/domains/nutrition/components/quick-log-meal-dialog";
import { Button } from "@/shared/components/ui/button";

/**
 * Atalhos da home de Saúde (CLAUDE.md > Fase 2 > SAÚDE > 9): Registrar
 * peso, Registrar refeição, +250ml, +500ml, Iniciar treino, Calcular IMC.
 * Combina componentes de domínios diferentes (health/nutrition/workouts) —
 * por isso vive na camada de página, não dentro de um domínio específico
 * (docs/architecture.md > 2).
 *
 * "Iniciar treino" e "Calcular IMC" levam direto à seção real (não são
 * ações de um clique só, pois exigem escolher um plano/preencher peso e
 * altura) — nunca um link morto ou placeholder.
 */
export function HealthShortcuts({ today }: { today: string }) {
  function scrollToSection(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <LogWeightDialog today={today} />
      <QuickLogMealDialog today={today} />
      <WaterQuickAddButtons today={today} className="contents" size="compact" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => scrollToSection("treino")}
      >
        Iniciar treino
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => scrollToSection("imc")}
      >
        Calcular IMC
      </Button>
    </div>
  );
}
