"use client";

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { QUERY_KEYS } from "@/shared/lib/query-keys";
import {
  computeBestStreak,
  computeCompletionRate,
  computeCurrentStreak,
} from "@/shared/lib/streak";
import { createClient } from "@/shared/lib/supabase/client";

import {
  listActiveHabits,
  listHabitLogsSinceForHabits,
} from "../services/habits-service";
import type { Habit } from "../types/habit";

export type HabitWithProgress = Habit & {
  completedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  completionRate7d: number | null;
};

// Janela de histórico suficiente para streaks realistas sem buscar a tabela
// inteira. 60 dias cobre qualquer análise de "últimos 7 dias" com folga.
const HISTORY_WINDOW_DAYS = 60;

export function useHabitsWithProgress(timezone: string) {
  const today = todayLocalDateString(timezone);

  return useQuery({
    queryKey: [...QUERY_KEYS.habits, "with-progress", today],
    queryFn: async (): Promise<HabitWithProgress[]> => {
      const supabase = createClient();
      const habits = await listActiveHabits(supabase);
      const sinceDate = format(
        subDays(new Date(today), HISTORY_WINDOW_DAYS),
        "yyyy-MM-dd",
      );
      const logsByHabit = await listHabitLogsSinceForHabits(
        supabase,
        habits.map((h) => h.id),
        sinceDate,
      );
      const sevenDaysAgo = format(subDays(new Date(today), 6), "yyyy-MM-dd");

      return habits.map((habit) => {
        const logs = logsByHabit[habit.id] ?? [];
        return {
          ...habit,
          completedToday: logs.includes(today),
          currentStreak: computeCurrentStreak(
            logs,
            habit.frequency,
            habit.daysOfWeek,
            today,
          ),
          bestStreak: computeBestStreak(
            logs,
            habit.frequency,
            habit.daysOfWeek,
          ),
          completionRate7d: computeCompletionRate(
            logs,
            habit.frequency,
            habit.daysOfWeek,
            sevenDaysAgo,
            today,
          ),
        };
      });
    },
  });
}
