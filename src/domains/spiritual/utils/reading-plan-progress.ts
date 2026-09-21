import { differenceInCalendarDays, parseISO } from "date-fns";

import { computeBestStreak, computeCurrentStreak } from "@/shared/lib/streak";

/**
 * Progresso de um plano de leitura: dia atual, dias concluídos, total,
 * porcentagem e streak — todos calculados a partir de `reading_plan_logs`,
 * nunca uma coluna mutável. Streak reaproveita a mesma função pura usada
 * por hábitos/devocional (frequência diária). Ver docs/business-rules.md >
 * 16.
 */
export type ReadingPlanLogPoint = { dayNumber: number; date: string };

export type ReadingPlanProgress = {
  currentDay: number;
  daysCompleted: number;
  totalDays: number;
  percent: number;
  currentStreak: number;
  bestStreak: number;
};

export function computeReadingPlanProgress(
  startDate: string,
  totalDays: number,
  logs: ReadingPlanLogPoint[],
  today: string,
): ReadingPlanProgress {
  const daysSinceStart = differenceInCalendarDays(
    parseISO(today),
    parseISO(startDate),
  );
  // Nunca menor que 1 (plano ainda não começou) nem maior que o total (o
  // plano "termina" no último dia, não continua contando depois).
  const currentDay = Math.min(totalDays, Math.max(1, daysSinceStart + 1));

  const uniqueDayNumbers = new Set(logs.map((log) => log.dayNumber));
  const daysCompleted = uniqueDayNumbers.size;

  // totalDays é sempre > 0 (check constraint no banco), mas a divisão fica
  // defendida mesmo assim — nunca retorna NaN/Infinity.
  const percent =
    totalDays === 0 ? 0 : Math.round((daysCompleted / totalDays) * 100);

  const loggedDates = logs.map((log) => log.date);
  const currentStreak = computeCurrentStreak(
    loggedDates,
    "diaria",
    null,
    today,
  );
  const bestStreak = computeBestStreak(loggedDates, "diaria", null);

  return {
    currentDay,
    daysCompleted,
    totalDays,
    percent,
    currentStreak,
    bestStreak,
  };
}
