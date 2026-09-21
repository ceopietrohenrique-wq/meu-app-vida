import { format, parseISO } from "date-fns";

/**
 * Mesma convenção usada pela função SQL `log_weight`
 * (`to_char(p_date, 'IYYY"-W"IW')`) — mantidas em paralelo porque uma roda
 * no banco (source_key do XP semanal de peso) e a outra no client (saber se
 * a missão "Registrar peso" já foi cumprida esta semana). Ver
 * docs/business-rules.md > 9.
 */
export function isoWeekKey(dateStr: string): string {
  return format(parseISO(dateStr), "RRRR-'W'II");
}
