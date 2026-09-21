import { describe, expect, it } from "vitest";

import { calculateBmi, classifyBmi } from "./bmi";

describe("calculateBmi", () => {
  it("calcula o IMC com valores conhecidos (70kg, 1.75m = 22.9)", () => {
    const result = calculateBmi(70, 175);
    expect(result.bmi).toBeCloseTo(22.9, 1);
    expect(result.category).toBe("peso_normal");
  });

  it("calcula corretamente nos limites de cada categoria", () => {
    expect(calculateBmi(56, 175).category).toBe("abaixo_do_peso"); // ~18.29
    expect(calculateBmi(80, 175).category).toBe("sobrepeso"); // ~26.12
    expect(calculateBmi(95, 175).category).toBe("obesidade"); // ~31.02
  });

  it("nunca divide por zero: altura 0 lança erro em vez de Infinity", () => {
    expect(() => calculateBmi(70, 0)).toThrow();
  });

  it("nunca retorna NaN: entradas não numéricas lançam erro", () => {
    expect(() => calculateBmi(Number.NaN, 175)).toThrow();
    expect(() => calculateBmi(70, Number.NaN)).toThrow();
  });

  it("valida peso impossível (negativo ou absurdamente alto)", () => {
    expect(() => calculateBmi(-10, 175)).toThrow();
    expect(() => calculateBmi(600, 175)).toThrow();
  });

  it("valida altura impossível (negativa ou absurdamente alta)", () => {
    expect(() => calculateBmi(70, -10)).toThrow();
    expect(() => calculateBmi(70, 350)).toThrow();
  });

  it("nunca retorna Infinity mesmo com altura muito pequena mas válida", () => {
    const result = calculateBmi(10, 1);
    expect(Number.isFinite(result.bmi)).toBe(true);
  });
});

describe("classifyBmi", () => {
  it("classifica os quatro limiares da OMS", () => {
    expect(classifyBmi(18.4)).toBe("abaixo_do_peso");
    expect(classifyBmi(18.5)).toBe("peso_normal");
    expect(classifyBmi(24.9)).toBe("peso_normal");
    expect(classifyBmi(25)).toBe("sobrepeso");
    expect(classifyBmi(29.9)).toBe("sobrepeso");
    expect(classifyBmi(30)).toBe("obesidade");
  });
});
