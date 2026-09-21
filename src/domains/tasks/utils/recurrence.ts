import {
  addDays,
  addMonths,
  addWeeks,
  format,
  getDay,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

const DATE_FORMAT = "yyyy-MM-dd";
const MAX_ITERATIONS = 3660;

export type RecurrenceConfig = {
  frequency: "diaria" | "semanal" | "mensal" | "dias_da_semana";
  daysOfWeek?: number[] | null;
  interval: number;
  startsOn: string;
  endsOn?: string | null;
};

function fmt(date: Date): string {
  return format(date, DATE_FORMAT);
}

function step(date: Date, config: RecurrenceConfig): Date {
  switch (config.frequency) {
    case "diaria":
      return addDays(date, config.interval);
    case "semanal":
      return addWeeks(date, config.interval);
    case "mensal":
      return addMonths(date, config.interval);
    case "dias_da_semana":
      return addDays(date, 1);
  }
}

/**
 * Gera as datas de ocorrência de uma recorrência dentro de uma janela
 * [rangeStart, rangeEnd] (inclusive), sem nunca ultrapassar `endsOn` nem
 * gerar antes de `startsOn`. Nunca sobrescreve histórico — cabe a quem
 * chama criar uma linha de `tasks` por data retornada, ligada por
 * `recurrence_id`, e o índice único (recurrence_id, due_date) do banco
 * garante que a mesma ocorrência nunca é criada duas vezes mesmo que este
 * gerador rode mais de uma vez sobre a mesma janela.
 */
export function generateOccurrenceDates(
  config: RecurrenceConfig,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const rangeStartDate = parseISO(rangeStart);
  const rangeEndDate = parseISO(rangeEnd);
  const hardEnd = config.endsOn ? parseISO(config.endsOn) : null;
  const effectiveEnd =
    hardEnd && isBefore(hardEnd, rangeEndDate) ? hardEnd : rangeEndDate;

  const dates: string[] = [];
  let cursor = parseISO(config.startsOn);

  if (config.frequency === "dias_da_semana") {
    const days = config.daysOfWeek ?? [];
    for (let i = 0; i < MAX_ITERATIONS && !isAfter(cursor, effectiveEnd); i++) {
      if (!isBefore(cursor, rangeStartDate) && days.includes(getDay(cursor))) {
        dates.push(fmt(cursor));
      }
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  for (let i = 0; i < MAX_ITERATIONS && isBefore(cursor, rangeStartDate); i++) {
    cursor = step(cursor, config);
  }

  for (let i = 0; i < MAX_ITERATIONS && !isAfter(cursor, effectiveEnd); i++) {
    dates.push(fmt(cursor));
    cursor = step(cursor, config);
  }

  return dates;
}
