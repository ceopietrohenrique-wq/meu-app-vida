import { describe, expect, it } from "vitest";

import { computeReadingPlanProgress } from "./reading-plan-progress";

describe("computeReadingPlanProgress", () => {
  it("calcula o dia atual a partir da data de início", () => {
    const progress = computeReadingPlanProgress(
      "2026-01-01",
      30,
      [],
      "2026-01-05",
    );
    expect(progress.currentDay).toBe(5);
  });

  it("nunca passa do total de dias mesmo se o plano já devia ter terminado", () => {
    const progress = computeReadingPlanProgress(
      "2026-01-01",
      10,
      [],
      "2026-06-01",
    );
    expect(progress.currentDay).toBe(10);
  });

  it("nunca fica abaixo de 1 se o plano começa no futuro", () => {
    const progress = computeReadingPlanProgress(
      "2026-06-01",
      10,
      [],
      "2026-01-01",
    );
    expect(progress.currentDay).toBe(1);
  });

  it("calcula dias concluídos e porcentagem sem duplicar dia repetido", () => {
    const logs = [
      { dayNumber: 1, date: "2026-01-01" },
      { dayNumber: 2, date: "2026-01-02" },
      { dayNumber: 2, date: "2026-01-02" }, // duplicado não deveria existir, mas não pode contar 2x
    ];
    const progress = computeReadingPlanProgress(
      "2026-01-01",
      10,
      logs,
      "2026-01-02",
    );
    expect(progress.daysCompleted).toBe(2);
    expect(progress.percent).toBe(20);
  });

  it("calcula streak a partir das datas reais de conclusão", () => {
    const logs = [
      { dayNumber: 1, date: "2026-01-01" },
      { dayNumber: 2, date: "2026-01-02" },
      { dayNumber: 3, date: "2026-01-03" },
    ];
    const progress = computeReadingPlanProgress(
      "2026-01-01",
      10,
      logs,
      "2026-01-03",
    );
    expect(progress.currentStreak).toBe(3);
    expect(progress.bestStreak).toBe(3);
  });

  it("nunca retorna NaN/Infinity mesmo sem nenhum log", () => {
    const progress = computeReadingPlanProgress(
      "2026-01-01",
      5,
      [],
      "2026-01-01",
    );
    expect(Number.isFinite(progress.percent)).toBe(true);
    expect(progress.percent).toBe(0);
  });
});
