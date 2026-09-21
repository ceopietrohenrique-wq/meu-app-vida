export type BudgetProgress = {
  plannedCents: number;
  realizedCents: number;
  remainingCents: number;
  /** 0-∞ (pode passar de 100 quando o orçamento estoura), null se plannedCents <= 0. */
  percent: number | null;
};

/**
 * Calcula planejado/realizado/restante/percentual de um orçamento. Nunca
 * divide por zero (CLAUDE.md > Fase 4 > 7): plannedCents <= 0 é um estado
 * impossível na prática (constraint `planned_amount > 0` no banco), mas a
 * função ainda se protege e retorna `percent: null` em vez de
 * NaN/Infinity — "sem dados", mesmo padrão de computeCompletionRate.
 */
export function computeBudgetProgress(
  plannedCents: number,
  realizedCents: number,
): BudgetProgress {
  const remainingCents = plannedCents - realizedCents;
  const percent =
    plannedCents > 0 ? (realizedCents / plannedCents) * 100 : null;

  return { plannedCents, realizedCents, remainingCents, percent };
}
