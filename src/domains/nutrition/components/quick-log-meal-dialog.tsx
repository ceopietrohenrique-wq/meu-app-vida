"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

import { useMealPlansWithStatus } from "../queries/use-meal-plans-with-status";
import { MealItem } from "./meal-item";

/**
 * Atalho da home de Saúde ("Registrar refeição" — CLAUDE.md > Fase 2 > 9).
 * Reaproveita a mesma lista/mutação do card de Alimentação, só num diálogo
 * de acesso rápido — nenhuma lógica nova, nenhuma duplicação de XP.
 */
export function QuickLogMealDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const { data: meals = [], isLoading } = useMealPlansWithStatus(today);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Registrar refeição</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar refeição</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        )}
        {!isLoading && meals.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma refeição planejada ainda. Crie uma no card de Alimentação
            para poder registrá-la aqui.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {meals.map((meal) => (
            <MealItem key={meal.id} meal={meal} today={today} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
