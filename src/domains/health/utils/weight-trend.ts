/**
 * Tendência de peso: compara a média móvel dos últimos registros contra o
 * período anterior, nunca o delta entre dois pontos isolados — para não
 * superestimar o significado de uma variação de um único dia (retenção de
 * líquido, horário da pesagem etc.). Ver docs/business-rules.md > 9.
 */

export type WeightTrendDirection = "subindo" | "descendo" | "estavel";

export type WeightTrend = {
  latestWeightKg: number;
  averageRecentKg: number;
  averagePreviousKg: number | null;
  changeKg: number | null;
  direction: WeightTrendDirection | null;
};

export type WeightLogPoint = { date: string; weightKg: number };

// Variações menores que isso (em kg) são tratadas como "estável" — evita
// mostrar "subindo"/"descendo" para ruído de balança.
const STABLE_THRESHOLD_KG = 0.3;
const DEFAULT_WINDOW_SIZE = 5;

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * `logs` não precisa estar ordenado; é ordenado internamente por data
 * ascendente. Retorna `null` quando não há nenhum registro.
 */
export function computeWeightTrend(
  logs: WeightLogPoint[],
  windowSize: number = DEFAULT_WINDOW_SIZE,
): WeightTrend | null {
  if (logs.length === 0) return null;

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeightKg = sorted[sorted.length - 1]!.weightKg;

  const recentWindow = sorted.slice(-windowSize);
  const averageRecentKg = average(recentWindow.map((l) => l.weightKg));

  const remaining = sorted.slice(0, Math.max(0, sorted.length - windowSize));
  const previousWindow = remaining.slice(-windowSize);

  if (previousWindow.length === 0) {
    return {
      latestWeightKg,
      averageRecentKg,
      averagePreviousKg: null,
      changeKg: null,
      direction: null,
    };
  }

  const averagePreviousKg = average(previousWindow.map((l) => l.weightKg));
  const changeKg = averageRecentKg - averagePreviousKg;

  let direction: WeightTrendDirection;
  if (Math.abs(changeKg) < STABLE_THRESHOLD_KG) {
    direction = "estavel";
  } else {
    direction = changeKg > 0 ? "subindo" : "descendo";
  }

  return {
    latestWeightKg,
    averageRecentKg,
    averagePreviousKg,
    changeKg,
    direction,
  };
}
