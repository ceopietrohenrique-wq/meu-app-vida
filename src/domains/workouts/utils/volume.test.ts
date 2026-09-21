import { describe, expect, it } from "vitest";

import { computeBestSet, computeVolume, getLastLoadKg } from "./volume";

describe("computeVolume", () => {
  it("soma carga x repetições de cada série", () => {
    const sets = [
      { loadKg: 80, reps: 10 },
      { loadKg: 80, reps: 9 },
      { loadKg: 75, reps: 11 },
    ];
    expect(computeVolume(sets)).toBe(80 * 10 + 80 * 9 + 75 * 11);
  });

  it("ignora séries sem carga ou repetições", () => {
    const sets = [
      { loadKg: 80, reps: 10 },
      { loadKg: null, reps: 8 },
      { loadKg: 60, reps: null },
    ];
    expect(computeVolume(sets)).toBe(800);
  });

  it("retorna 0 para lista vazia", () => {
    expect(computeVolume([])).toBe(0);
  });
});

describe("computeBestSet", () => {
  it("encontra a série com maior carga x repetições", () => {
    const sets = [
      { loadKg: 80, reps: 10 },
      { loadKg: 90, reps: 6 },
      { loadKg: 75, reps: 11 },
    ];
    // 80x10=800, 90x6=540, 75x11=825 — a última série vence por volume total.
    expect(computeBestSet(sets)).toEqual({ loadKg: 75, reps: 11 });
  });

  it("retorna null quando não há nenhuma série válida", () => {
    expect(computeBestSet([{ loadKg: null, reps: null }])).toBeNull();
    expect(computeBestSet([])).toBeNull();
  });
});

describe("getLastLoadKg", () => {
  it("retorna a carga da última série cronológica com carga registrada", () => {
    const sets = [
      { loadKg: 80, reps: 10 },
      { loadKg: 82.5, reps: 8 },
    ];
    expect(getLastLoadKg(sets)).toBe(82.5);
  });

  it("pula séries sem carga registrada ao buscar de trás para frente", () => {
    const sets = [
      { loadKg: 80, reps: 10 },
      { loadKg: null, reps: 8 },
    ];
    expect(getLastLoadKg(sets)).toBe(80);
  });

  it("retorna null quando nenhuma série tem carga", () => {
    expect(getLastLoadKg([])).toBeNull();
  });
});
