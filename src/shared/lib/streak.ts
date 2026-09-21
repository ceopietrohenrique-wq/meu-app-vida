import { addDays, format, getDay, parseISO, subDays } from "date-fns";

/**
 * Cálculo genérico de streak/taxa de conclusão sobre uma lista de datas
 * "com log" — usado por hábitos (Fase 1), devocional e plano de leitura
 * (Fase 3). Promovido de `domains/habits/utils/streak.ts` para cá quando um
 * segundo domínio passou a precisar da mesma lógica (docs/architecture.md >
 * 13) — nenhum domínio deve reimplementar isso.
 */
export type HabitFrequency = "diaria" | "dias_da_semana";

const DATE_FORMAT = "yyyy-MM-dd";
// Limite de segurança contra loop infinito caso os dados estejam corrompidos
// (ex.: hábito marcado como concluído todo santo dia por 10+ anos seguidos).
const MAX_LOOKBACK_DAYS = 3650;

function fmt(date: Date): string {
  return format(date, DATE_FORMAT);
}

export function isExpectedDay(
  dateStr: string,
  frequency: HabitFrequency,
  daysOfWeek: number[] | null | undefined,
): boolean {
  if (frequency === "diaria") return true;
  const dow = getDay(parseISO(dateStr));
  return (daysOfWeek ?? []).includes(dow);
}

function previousExpectedDate(date: Date, daysOfWeek: number[]): Date {
  let cursor = subDays(date, 1);
  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(getDay(cursor))) return cursor;
    cursor = subDays(cursor, 1);
  }
  return cursor;
}

/**
 * Streak atual: dias consecutivos com log, terminando hoje OU ontem (para
 * não zerar a sequência antes de o usuário ter chance de marcar o dia
 * atual). Para frequências com dias específicos, só os dias esperados
 * contam. Ver docs/business-rules.md > 3.
 */
export function computeCurrentStreak(
  loggedDates: string[],
  frequency: HabitFrequency,
  daysOfWeek: number[] | null | undefined,
  todayStr: string,
): number {
  const logSet = new Set(loggedDates);
  const days = daysOfWeek ?? [];

  let cursor = parseISO(todayStr);

  if (frequency === "dias_da_semana") {
    if (days.length === 0) return 0;
    if (
      isExpectedDay(fmt(cursor), frequency, days) &&
      !logSet.has(fmt(cursor))
    ) {
      cursor = subDays(cursor, 1);
    }
    while (!isExpectedDay(fmt(cursor), frequency, days)) {
      cursor = subDays(cursor, 1);
    }
  } else if (!logSet.has(fmt(cursor))) {
    cursor = subDays(cursor, 1);
  }

  if (!logSet.has(fmt(cursor))) return 0;

  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const key = fmt(cursor);
    if (!isExpectedDay(key, frequency, days)) {
      cursor = subDays(cursor, 1);
      continue;
    }
    if (!logSet.has(key)) break;
    streak++;
    cursor =
      frequency === "dias_da_semana"
        ? previousExpectedDate(cursor, days)
        : subDays(cursor, 1);
  }
  return streak;
}

/**
 * Melhor streak já observado no histórico completo de logs.
 */
export function computeBestStreak(
  loggedDates: string[],
  frequency: HabitFrequency,
  daysOfWeek: number[] | null | undefined,
): number {
  const days = daysOfWeek ?? [];
  const relevantDates = [...new Set(loggedDates)]
    .filter((d) => isExpectedDay(d, frequency, days))
    .sort();

  if (relevantDates.length === 0) return 0;

  let best = 1;
  let current = 1;
  let prevDate = parseISO(relevantDates[0]!);

  for (let i = 1; i < relevantDates.length; i++) {
    const date = parseISO(relevantDates[i]!);
    const expectedPrev =
      frequency === "dias_da_semana"
        ? previousExpectedDate(date, days)
        : subDays(date, 1);

    if (fmt(expectedPrev) === fmt(prevDate)) {
      current++;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    prevDate = date;
  }

  return best;
}

/**
 * Taxa de conclusão no período: dias com log / dias esperados no período.
 * Nunca divide por zero — retorna null ("sem dados") quando não há nenhuma
 * ocorrência esperada no período.
 */
export function computeCompletionRate(
  loggedDates: string[],
  frequency: HabitFrequency,
  daysOfWeek: number[] | null | undefined,
  periodStart: string,
  periodEnd: string,
): number | null {
  const logSet = new Set(loggedDates);
  const days = daysOfWeek ?? [];

  let expected = 0;
  let completed = 0;
  let cursor = parseISO(periodStart);
  const end = parseISO(periodEnd);

  for (let i = 0; cursor <= end && i < MAX_LOOKBACK_DAYS; i++) {
    const key = fmt(cursor);
    if (isExpectedDay(key, frequency, days)) {
      expected++;
      if (logSet.has(key)) completed++;
    }
    cursor = addDays(cursor, 1);
  }

  if (expected === 0) return null;
  return completed / expected;
}
