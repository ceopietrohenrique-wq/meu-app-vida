"use client";

import { toast } from "sonner";

import { cn } from "@/shared/lib/utils";

import { useSetMealLogStatus } from "../mutations/use-meal-mutations";
import type { MealPlanWithStatus } from "../queries/use-meal-plans-with-status";
import type { MealLogStatus } from "../types/meal";

const STATUS_OPTIONS: { value: MealLogStatus; label: string }[] = [
  { value: "realizada", label: "Realizada" },
  { value: "parcial", label: "Parcial" },
  { value: "nao_realizada", label: "Não realizada" },
];

export function MealItem({
  meal,
  today,
}: {
  meal: MealPlanWithStatus;
  today: string;
}) {
  const setStatus = useSetMealLogStatus();

  async function handleSetStatus(status: MealLogStatus) {
    if (setStatus.isPending) return;
    try {
      const result = await setStatus.mutateAsync({
        mealPlanId: meal.id,
        date: today,
        status,
      });
      if (result.xpAwarded) {
        toast.success(`Adesão alimentar registrada. +${result.xpAmount} XP`);
      }
    } catch {
      toast.error("Não foi possível atualizar a refeição.");
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{meal.name}</span>
          {meal.time && (
            <span className="text-muted-foreground ml-2 text-xs">
              {meal.time}
            </span>
          )}
        </div>
      </div>
      {meal.items && (
        <p className="text-muted-foreground text-xs">{meal.items}</p>
      )}
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSetStatus(option.value)}
            disabled={setStatus.isPending}
            aria-pressed={meal.statusToday === option.value}
            className={cn(
              "flex-1 rounded-md border py-1.5 text-xs font-medium disabled:opacity-50",
              meal.statusToday === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </li>
  );
}
