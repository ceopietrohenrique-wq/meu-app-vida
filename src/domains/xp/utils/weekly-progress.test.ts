import { describe, expect, it } from "vitest";

import {
  computeWeeklyProgressPercent,
  isWeeklyGoalReached,
} from "./weekly-progress";

describe("computeWeeklyProgressPercent", () => {
  it("calcula a porcentagem normalmente", () => {
    expect(computeWeeklyProgressPercent(620, 800)).toBe(78);
  });

  it("nunca ultrapassa 100% na exibição, mesmo passando da meta", () => {
    expect(computeWeeklyProgressPercent(900, 800)).toBe(100);
  });

  it("nunca divide por zero: meta zerada retorna 0%", () => {
    expect(computeWeeklyProgressPercent(100, 0)).toBe(0);
  });
});

describe("isWeeklyGoalReached", () => {
  it("é true quando o XP alcança ou ultrapassa a meta", () => {
    expect(isWeeklyGoalReached(800, 800)).toBe(true);
    expect(isWeeklyGoalReached(801, 800)).toBe(true);
  });

  it("é false quando a meta não é configurada", () => {
    expect(isWeeklyGoalReached(1000, 0)).toBe(false);
  });
});
