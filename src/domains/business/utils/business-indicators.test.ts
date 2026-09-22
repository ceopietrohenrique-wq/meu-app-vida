import { describe, expect, it } from "vitest";

import {
  computeAverageTicketCents,
  computeConversionPercent,
  computeGrossProfitCents,
  computeMarginPercent,
  computeNetProfitCents,
  computeRoiPercent,
} from "./business-indicators";

// Caso exato do CLAUDE.md > Fase 5 > 12:
// bruto 1000,00; desconto 100,00; líquida 900,00; custo direto 200,00; taxas 50,00.
const NET_REVENUE_CENTS = 90000;
const DIRECT_COSTS_CENTS = 20000;
const FEES_CENTS = 5000;

describe("computeGrossProfitCents", () => {
  it("900,00 líquida - 200,00 custo direto = 700,00 lucro bruto", () => {
    expect(computeGrossProfitCents(NET_REVENUE_CENTS, DIRECT_COSTS_CENTS)).toBe(
      70000,
    );
  });
});

describe("computeNetProfitCents", () => {
  it("700,00 lucro bruto - 0 despesas operacionais - 50,00 taxas = 650,00 lucro líquido gerencial", () => {
    const grossProfit = computeGrossProfitCents(
      NET_REVENUE_CENTS,
      DIRECT_COSTS_CENTS,
    );
    expect(computeNetProfitCents(grossProfit, 0, FEES_CENTS)).toBe(65000);
  });

  it("desconta também despesas operacionais atribuídas", () => {
    expect(computeNetProfitCents(70000, 10000, 5000)).toBe(55000);
  });
});

describe("computeMarginPercent", () => {
  it("700,00 / 900,00 × 100 = 77.78%", () => {
    expect(computeMarginPercent(70000, NET_REVENUE_CENTS)).toBeCloseTo(
      77.777,
      2,
    );
  });

  it("nunca divide por zero: receita líquida 0 retorna null", () => {
    expect(computeMarginPercent(0, 0)).toBeNull();
    expect(computeMarginPercent(100, 0)).toBeNull();
  });
});

describe("computeRoiPercent", () => {
  it("700,00 lucro bruto / 200,00 custo direto × 100 = 350%", () => {
    expect(computeRoiPercent(70000, DIRECT_COSTS_CENTS)).toBe(350);
  });

  it("nunca calculável sem custo direto identificável: retorna null, nunca Infinity/NaN", () => {
    expect(computeRoiPercent(500, 0)).toBeNull();
    expect(Number.isFinite(computeRoiPercent(500, 0) ?? 0)).toBe(true);
  });
});

describe("computeAverageTicketCents", () => {
  it("900,00 líquida / 3 vendas = 300,00", () => {
    expect(computeAverageTicketCents(90000, 3)).toBe(30000);
  });

  it("nunca divide por zero: 0 vendas retorna null", () => {
    expect(computeAverageTicketCents(90000, 0)).toBeNull();
  });
});

describe("computeConversionPercent", () => {
  it("2 fechados de 10 leads = 20%", () => {
    expect(computeConversionPercent(2, 10)).toBe(20);
  });

  it("nunca divide por zero: 0 leads retorna null", () => {
    expect(computeConversionPercent(0, 0)).toBeNull();
  });
});
