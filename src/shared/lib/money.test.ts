import { describe, expect, it } from "vitest";

import {
  centsToDecimalString,
  formatCurrencyBRL,
  parseMoneyToCents,
} from "./money";

describe("parseMoneyToCents", () => {
  it("converte valores conhecidos vindos do Postgres (numeric como string)", () => {
    expect(parseMoneyToCents("2.00")).toBe(200);
    expect(parseMoneyToCents("0.05")).toBe(5);
    expect(parseMoneyToCents("39.9")).toBe(3990);
    expect(parseMoneyToCents("1234.5")).toBe(123450);
    expect(parseMoneyToCents("100")).toBe(10000);
  });

  it("preserva o sinal negativo (ex.: saldo negativo)", () => {
    expect(parseMoneyToCents("-10.5")).toBe(-1050);
    expect(parseMoneyToCents(-10.5)).toBe(-1050);
  });

  it("aceita number diretamente (retorno já numérico do supabase-js)", () => {
    expect(parseMoneyToCents(2)).toBe(200);
    expect(parseMoneyToCents(39.9)).toBe(3990);
  });

  it("nunca retorna NaN/Infinity — entrada inválida vira 0", () => {
    expect(parseMoneyToCents("abc")).toBe(0);
    expect(parseMoneyToCents("")).toBe(0);
    expect(Number.isFinite(parseMoneyToCents("abc"))).toBe(true);
  });

  it("soma repetida de centavos nunca sofre erro de ponto flutuante (0.1 + 0.2 clássico)", () => {
    const total =
      parseMoneyToCents("0.10") +
      parseMoneyToCents("0.20") +
      parseMoneyToCents("0.10");
    expect(total).toBe(40);
  });
});

describe("centsToDecimalString", () => {
  it("converte centavos de volta para a string decimal do Postgres", () => {
    expect(centsToDecimalString(200)).toBe("2.00");
    expect(centsToDecimalString(3990)).toBe("39.90");
    expect(centsToDecimalString(5)).toBe("0.05");
    expect(centsToDecimalString(123450)).toBe("1234.50");
  });

  it("preserva o sinal negativo", () => {
    expect(centsToDecimalString(-1050)).toBe("-10.50");
  });

  it("nunca retorna NaN — entrada inválida vira 0.00", () => {
    expect(centsToDecimalString(Number.NaN)).toBe("0.00");
    expect(centsToDecimalString(Number.POSITIVE_INFINITY)).toBe("0.00");
  });

  it("é o inverso exato de parseMoneyToCents para valores conhecidos", () => {
    expect(centsToDecimalString(parseMoneyToCents("920.00"))).toBe("920.00");
  });
});

describe("formatCurrencyBRL", () => {
  it("formata valores conhecidos como moeda BRL", () => {
    expect(formatCurrencyBRL(200)).toContain("2,00");
    expect(formatCurrencyBRL(514000)).toContain("5.140,00");
    expect(formatCurrencyBRL(92000)).toContain("920,00");
  });

  it("nunca exibe NaN/Infinity — entrada inválida vira R$ 0,00", () => {
    expect(formatCurrencyBRL(Number.NaN)).toContain("0,00");
    expect(formatCurrencyBRL(Number.POSITIVE_INFINITY)).toContain("0,00");
    expect(formatCurrencyBRL(Number.NaN)).not.toContain("NaN");
    expect(formatCurrencyBRL(Number.POSITIVE_INFINITY)).not.toContain("∞");
  });
});
