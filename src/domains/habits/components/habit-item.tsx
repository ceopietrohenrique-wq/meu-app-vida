"use client";

import { Check, Flame } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { cn } from "@/shared/lib/utils";

import {
  useCompleteHabit,
  useUncompleteHabit,
} from "../mutations/use-habit-mutations";
import type { HabitWithProgress } from "../queries/use-habits-with-progress";

export function HabitItem({
  habit,
  timezone,
}: {
  habit: HabitWithProgress;
  timezone: string;
}) {
  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();
  const isPending = completeHabit.isPending || uncompleteHabit.isPending;

  async function handleToggle() {
    if (isPending) return;
    const date = todayLocalDateString(timezone);
    try {
      if (habit.completedToday) {
        await uncompleteHabit.mutateAsync({ habitId: habit.id, date });
      } else {
        const result = await completeHabit.mutateAsync({
          habitId: habit.id,
          date,
        });
        if (result.xpAwarded) {
          toast.success(`Hábito concluído. +${result.xpAmount} XP`);
        }
      }
    } catch {
      toast.error("Não foi possível atualizar o hábito.");
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={habit.completedToday}
        aria-label={
          habit.completedToday ? "Desmarcar hábito" : "Concluir hábito"
        }
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          habit.completedToday
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary text-transparent",
        )}
      >
        <Check className="size-4" />
      </button>
      <div className="flex flex-1 flex-col">
        <span className="text-sm">{habit.name}</span>
        {habit.currentStreak > 0 && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Flame className="size-3" /> {habit.currentStreak}{" "}
            {habit.currentStreak === 1 ? "dia seguido" : "dias seguidos"}
          </span>
        )}
      </div>
      <Badge variant="secondary">+{habit.xpReward} XP</Badge>
    </li>
  );
}
