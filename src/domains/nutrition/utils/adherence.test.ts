import { describe, expect, it } from "vitest";

import {
  buildWeekAdherenceStrip,
  computeDaysWithAtLeastOneMealCompleted,
  computeMealAdherenceRate,
} from "./adherence";

describe("computeMealAdherenceRate", () => {
  it("calcula a proporção de refeições realizadas sobre o esperado", () => {
    const logs = [
      { date: "2026-01-01", mealPlanId: "a", status: "realizada" as const },
      { date: "2026-01-01", mealPlanId: "b", status: "parcial" as const },
    ];
    // 2 refeições planejadas x 1 dia = 2 esperadas, 1 realizada = 50%.
    expect(computeMealAdherenceRate(logs, 2, 1)).toBe(0.5);
  });

  it("nunca divide por zero: sem refeições planejadas retorna null", () => {
    expect(computeMealAdherenceRate([], 0, 7)).toBeNull();
  });

  it("período de 0 dias também retorna null em vez de NaN", () => {
    expect(computeMealAdherenceRate([], 5, 0)).toBeNull();
  });

  it("ignora status parcial/não realizada na contagem de completas", () => {
    const logs = [
      { date: "2026-01-01", mealPlanId: "a", status: "nao_realizada" as const },
      { date: "2026-01-01", mealPlanId: "b", status: "parcial" as const },
    ];
    expect(computeMealAdherenceRate(logs, 2, 1)).toBe(0);
  });
});

describe("computeDaysWithAtLeastOneMealCompleted", () => {
  it("conta dias distintos com pelo menos uma refeição realizada", () => {
    const logs = [
      { date: "2026-01-01", mealPlanId: "a", status: "realizada" as const },
      { date: "2026-01-01", mealPlanId: "b", status: "realizada" as const },
      { date: "2026-01-02", mealPlanId: "a", status: "nao_realizada" as const },
      { date: "2026-01-03", mealPlanId: "a", status: "realizada" as const },
    ];
    expect(computeDaysWithAtLeastOneMealCompleted(logs)).toBe(2);
  });

  it("retorna 0 quando não há nenhum log", () => {
    expect(computeDaysWithAtLeastOneMealCompleted([])).toBe(0);
  });
});

describe("buildWeekAdherenceStrip", () => {
  it("gera um dia por data no intervalo, marcando os dias com refeição realizada", () => {
    const logs = [
      { date: "2026-01-01", mealPlanId: "a", status: "realizada" as const },
      { date: "2026-01-03", mealPlanId: "a", status: "parcial" as const },
    ];
    const strip = buildWeekAdherenceStrip(logs, "2026-01-01", "2026-01-03");
    expect(strip).toEqual([
      { date: "2026-01-01", completed: true },
      { date: "2026-01-02", completed: false },
      { date: "2026-01-03", completed: false },
    ]);
  });

  it("retorna um único dia quando início e fim são iguais", () => {
    const strip = buildWeekAdherenceStrip([], "2026-01-01", "2026-01-01");
    expect(strip).toHaveLength(1);
  });
});
