import { describe, expect, it } from "vitest";

import {
  computeGrossProfitCents,
  computeMarginPercent,
} from "./sale-indicators";

// Mesmo caso de docs/business-rules.md > Fase 5 > 12, replicado aqui porque
// esta é agora a definição canônica (business-indicators.ts reexporta
// daqui — ver comentário no topo daquele arquivo).
const NET_REVENUE_CENTS = 90000;
const DIRECT_COSTS_CENTS = 20000;

describe("computeGrossProfitCents", () => {
  it("900,00 líquida - 200,00 custo direto = 700,00 lucro bruto", () => {
    expect(computeGrossProfitCents(NET_REVENUE_CENTS, DIRECT_COSTS_CENTS)).toBe(
      70000,
    );
  });
});

describe("computeMarginPercent", () => {
  it("calcula margem como lucro bruto / receita líquida × 100", () => {
    const grossProfit = computeGrossProfitCents(
      NET_REVENUE_CENTS,
      DIRECT_COSTS_CENTS,
    );
    expect(computeMarginPercent(grossProfit, NET_REVENUE_CENTS)).toBeCloseTo(
      77.78,
      2,
    );
  });

  it("nunca divide por zero — receita líquida <= 0 retorna null", () => {
    expect(computeMarginPercent(1000, 0)).toBeNull();
    expect(computeMarginPercent(1000, -500)).toBeNull();
  });
});
