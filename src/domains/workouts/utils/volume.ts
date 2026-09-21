/**
 * Volume, última carga e melhor desempenho de um exercício — sempre
 * calculados a partir das séries registradas (exercise_sets), nunca uma
 * coluna mutável denormalizada. Ver docs/business-rules.md > 12.
 */

export type ExerciseSetPoint = {
  loadKg: number | null;
  reps: number | null;
};

/** Volume de uma sessão/exercício = soma de (carga x repetições) de cada série. */
export function computeVolume(sets: ExerciseSetPoint[]): number {
  return sets.reduce((total, set) => {
    if (set.loadKg == null || set.reps == null) return total;
    return total + set.loadKg * set.reps;
  }, 0);
}

/** Melhor desempenho = a série com maior carga x repetições. */
export function computeBestSet(
  sets: ExerciseSetPoint[],
): ExerciseSetPoint | null {
  let best: ExerciseSetPoint | null = null;
  let bestScore = -Infinity;

  for (const set of sets) {
    if (set.loadKg == null || set.reps == null) continue;
    const score = set.loadKg * set.reps;
    if (score > bestScore) {
      bestScore = score;
      best = set;
    }
  }

  return best;
}

/** Última carga usada = carga da última série registrada (ordem cronológica). */
export function getLastLoadKg(
  setsInChronologicalOrder: ExerciseSetPoint[],
): number | null {
  for (let i = setsInChronologicalOrder.length - 1; i >= 0; i--) {
    const load = setsInChronologicalOrder[i]!.loadKg;
    if (load != null) return load;
  }
  return null;
}
