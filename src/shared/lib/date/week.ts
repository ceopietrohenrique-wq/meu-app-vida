import { format, getDay, parseISO, subDays } from "date-fns";

/**
 * Mesma lógica da função SQL `week_start_date` (supabase/migrations) —
 * mantidas em paralelo porque uma roda no banco (agregação de XP) e a
 * outra no client (saber qual semana exibir/salvar). Qualquer mudança na
 * regra de "início da semana" precisa ser replicada nas duas.
 */
export function getWeekStartDate(
  localDateStr: string,
  weekStart: number,
): string {
  const date = parseISO(localDateStr);
  const diff = (getDay(date) - weekStart + 7) % 7;
  return format(subDays(date, diff), "yyyy-MM-dd");
}
