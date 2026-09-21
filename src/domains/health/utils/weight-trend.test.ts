import { describe, expect, it } from "vitest";

import { computeWeightTrend } from "./weight-trend";

describe("computeWeightTrend", () => {
  it("retorna null quando não há nenhum registro", () => {
    expect(computeWeightTrend([])).toBeNull();
  });

  it("sem histórico anterior suficiente, não calcula direção", () => {
    const logs = [
      { date: "2026-01-01", weightKg: 80 },
      { date: "2026-01-02", weightKg: 79.8 },
    ];
    const trend = computeWeightTrend(logs, 5);
    expect(trend?.direction).toBeNull();
    expect(trend?.changeKg).toBeNull();
    expect(trend?.latestWeightKg).toBe(79.8);
  });

  it("não exagera o significado de uma variação de um único dia", () => {
    // média das últimas 5 pesagens é quase igual à média das 5 anteriores,
    // apesar do último registro isolado ter subido bastante.
    const logs = [
      { date: "2026-01-01", weightKg: 80 },
      { date: "2026-01-02", weightKg: 79.9 },
      { date: "2026-01-03", weightKg: 80.1 },
      { date: "2026-01-04", weightKg: 80 },
      { date: "2026-01-05", weightKg: 79.9 },
      { date: "2026-01-06", weightKg: 79.8 },
      { date: "2026-01-07", weightKg: 80 },
      { date: "2026-01-08", weightKg: 79.9 },
      { date: "2026-01-09", weightKg: 80.1 },
      { date: "2026-01-10", weightKg: 80.9 }, // pico isolado de um dia
    ];
    const trend = computeWeightTrend(logs, 5);
    expect(trend?.direction).toBe("estavel");
  });

  it("detecta tendência de queda consistente", () => {
    const logs = [
      { date: "2026-01-01", weightKg: 85 },
      { date: "2026-01-02", weightKg: 85 },
      { date: "2026-01-03", weightKg: 84.8 },
      { date: "2026-01-04", weightKg: 85 },
      { date: "2026-01-05", weightKg: 84.9 },
      { date: "2026-01-06", weightKg: 83 },
      { date: "2026-01-07", weightKg: 82.8 },
      { date: "2026-01-08", weightKg: 82.9 },
      { date: "2026-01-09", weightKg: 82.7 },
      { date: "2026-01-10", weightKg: 82.5 },
    ];
    const trend = computeWeightTrend(logs, 5);
    expect(trend?.direction).toBe("descendo");
    expect(trend?.changeKg).toBeLessThan(0);
  });

  it("ordena os registros por data mesmo se vierem fora de ordem", () => {
    const logs = [
      { date: "2026-01-05", weightKg: 79 },
      { date: "2026-01-01", weightKg: 80 },
      { date: "2026-01-03", weightKg: 79.5 },
    ];
    const trend = computeWeightTrend(logs, 2);
    expect(trend?.latestWeightKg).toBe(79);
  });
});
