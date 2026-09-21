/**
 * Adesão alimentar: proporção de refeições planejadas marcadas "realizada"
 * sobre o total de refeições planejadas esperadas no período. Mesma
 * filosofia de computeCompletionRate (habits, Fase 1): nunca divide por
 * zero. Ver docs/business-rules.md > 11.
 */

export type MealLogStatus = "realizada" | "parcial" | "nao_realizada";

export type MealAdherenceLog = {
  date: string;
  mealPlanId: string;
  status: MealLogStatus;
};

/**
 * `activeMealPlanCount` = quantas refeições planejadas ativas existem (ex.:
 * 5 refeições cadastradas). `days` = quantos dias o período cobre.
 * `dias esperados` = activeMealPlanCount * days. Retorna null quando esse
 * denominador é 0 (nenhuma refeição planejada ainda) em vez de NaN.
 */
export function computeMealAdherenceRate(
  logs: MealAdherenceLog[],
  activeMealPlanCount: number,
  days: number,
): number | null {
  const expected = activeMealPlanCount * days;
  if (expected === 0) return null;

  const completed = logs.filter((log) => log.status === "realizada").length;
  return completed / expected;
}

/**
 * Quantidade de dias distintos no período com pelo menos uma refeição
 * "realizada" — usado no formato de exibição "Adesão da semana: 6 / 7 dias".
 */
export function computeDaysWithAtLeastOneMealCompleted(
  logs: MealAdherenceLog[],
): number {
  const daysWithCompletion = new Set(
    logs.filter((log) => log.status === "realizada").map((log) => log.date),
  );
  return daysWithCompletion.size;
}

export type AdherenceStripDay = { date: string; completed: boolean };

/**
 * Gráfico básico de adesão semanal (uma faixa de 7 dias, cada um marcado
 * como "teve refeição realizada" ou não) — ver CLAUDE.md > Fase 2 >
 * GRÁFICOS BÁSICOS. `sinceDate`/`untilDate` são strings "yyyy-MM-dd"
 * (comparação lexicográfica funciona nesse formato).
 */
export function buildWeekAdherenceStrip(
  logs: MealAdherenceLog[],
  sinceDate: string,
  untilDate: string,
): AdherenceStripDay[] {
  const completedDates = new Set(
    logs.filter((log) => log.status === "realizada").map((log) => log.date),
  );

  const days: AdherenceStripDay[] = [];
  let cursor = sinceDate;
  while (cursor <= untilDate) {
    days.push({ date: cursor, completed: completedDates.has(cursor) });
    const next = new Date(`${cursor}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return days;
}
