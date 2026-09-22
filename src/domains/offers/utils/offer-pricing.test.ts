import { describe, expect, it } from "vitest";

import { computeOfferPricing } from "./offer-pricing";

describe("computeOfferPricing", () => {
  it("kit com múltiplos itens, sem desconto", () => {
    const result = computeOfferPricing(
      [
        { quantity: 2, unitPriceCents: 5000, unitCostCents: 2000 },
        { quantity: 1, unitPriceCents: 30000, unitCostCents: 0 },
      ],
      null,
    );
    expect(result.individualSumCents).toBe(40000); // 2×50 + 300
    expect(result.discountCents).toBe(0);
    expect(result.finalPriceCents).toBe(40000);
    expect(result.estimatedCostCents).toBe(4000); // 2×20
    expect(result.estimatedProfitCents).toBe(36000);
    expect(result.estimatedMarginPercent).toBeCloseTo(90, 5);
  });

  it("desconto percentual aplicado sobre a soma individual", () => {
    const result = computeOfferPricing(
      [{ quantity: 1, unitPriceCents: 10000, unitCostCents: 4000 }],
      { type: "percent", value: 10 },
    );
    expect(result.individualSumCents).toBe(10000);
    expect(result.discountCents).toBe(1000);
    expect(result.finalPriceCents).toBe(9000);
    expect(result.estimatedProfitCents).toBe(5000);
    expect(result.estimatedMarginPercent).toBeCloseTo(55.5556, 3);
  });

  it("desconto fixo em centavos", () => {
    const result = computeOfferPricing(
      [{ quantity: 1, unitPriceCents: 10000, unitCostCents: 0 }],
      { type: "fixed", value: 1500 },
    );
    expect(result.discountCents).toBe(1500);
    expect(result.finalPriceCents).toBe(8500);
  });

  it("desconto nunca deixa o preço final negativo", () => {
    const result = computeOfferPricing(
      [{ quantity: 1, unitPriceCents: 1000, unitCostCents: 0 }],
      { type: "fixed", value: 5000 },
    );
    expect(result.discountCents).toBe(1000);
    expect(result.finalPriceCents).toBe(0);
  });

  it("nunca divide por zero: preço final 0 retorna margem null", () => {
    const result = computeOfferPricing(
      [{ quantity: 1, unitPriceCents: 0, unitCostCents: 0 }],
      null,
    );
    expect(result.estimatedMarginPercent).toBeNull();
  });

  it("prejuízo estimado (custo maior que preço) retorna margem negativa, não null", () => {
    const result = computeOfferPricing(
      [{ quantity: 1, unitPriceCents: 1000, unitCostCents: 1500 }],
      null,
    );
    expect(result.estimatedProfitCents).toBe(-500);
    expect(result.estimatedMarginPercent).toBeCloseTo(-50, 5);
  });
});
