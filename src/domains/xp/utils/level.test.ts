import { describe, expect, it } from "vitest";

import { computeLevel, computeXpToNextLevel } from "./level";

describe("computeLevel", () => {
  it("começa no nível 1 com 0 XP", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("sobe de nível exatamente nos limiares de 500 XP", () => {
    expect(computeLevel(499)).toBe(1);
    expect(computeLevel(500)).toBe(2);
    expect(computeLevel(999)).toBe(2);
    expect(computeLevel(1000)).toBe(3);
  });

  it("nunca retorna nível menor que 1, mesmo com XP negativo", () => {
    expect(computeLevel(-50)).toBe(1);
  });
});

describe("computeXpToNextLevel", () => {
  it("calcula quanto falta para o próximo nível", () => {
    expect(computeXpToNextLevel(0)).toBe(500);
    expect(computeXpToNextLevel(450)).toBe(50);
    expect(computeXpToNextLevel(500)).toBe(500);
  });
});
