/**
 * Fórmula de progressão de nível: 500 XP total por nível.
 * Documentada em docs/business-rules.md > 2 (Cálculo de XP).
 */
const XP_PER_LEVEL = 500;

export function computeLevel(totalXp: number): number {
  return Math.floor(Math.max(totalXp, 0) / XP_PER_LEVEL) + 1;
}

/** XP acumulado dentro do nível atual (para uma eventual barra de progresso de nível). */
export function computeXpIntoCurrentLevel(totalXp: number): number {
  return Math.max(totalXp, 0) % XP_PER_LEVEL;
}

export function computeXpToNextLevel(totalXp: number): number {
  return XP_PER_LEVEL - computeXpIntoCurrentLevel(totalXp);
}
