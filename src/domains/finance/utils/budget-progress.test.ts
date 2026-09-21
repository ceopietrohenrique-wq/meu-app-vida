import { describe, expect, it } from "vitest";

import { computeBudgetProgress } from "./budget-progress";

describe("computeBudgetProgress", () => {
  it("calcula com valores conhecidos (R$ 620 de R$ 800 = 78%)", () => {
    const result = computeBudgetProgress(80000, 62000);
    expect(result.remainingCents).toBe(18000);
    expect(result.percent).toBeCloseTo(77.5, 5);
  });

  it("exemplo do CLAUDE.md: R$ 800 planejado, dashboard mostra 620/800, 78%", () => {
    const result = computeBudgetProgress(80000, 62400);
    expect(result.percent).toBeCloseTo(78, 5);
  });

  it("permite estourar 100% (percentual > 100, restante negativo)", () => {
    const result = computeBudgetProgress(80000, 92000);
    expect(result.percent).toBeCloseTo(115, 5);
    expect(result.remainingCents).toBe(-12000);
  });

  it("nunca divide por zero: planejado <= 0 retorna percent null, nunca NaN/Infinity", () => {
    expect(computeBudgetProgress(0, 5000).percent).toBeNull();
    expect(computeBudgetProgress(-100, 5000).percent).toBeNull();
  });

  it("realizado 0 é 0%, não null", () => {
    expect(computeBudgetProgress(80000, 0).percent).toBe(0);
  });
});
