export type OfferPricingItem = {
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
};

export type OfferPricing = {
  individualSumCents: number;
  discountCents: number;
  finalPriceCents: number;
  estimatedCostCents: number;
  estimatedProfitCents: number;
  /** 0-100, ou null se finalPriceCents <= 0 (nunca divide por zero). */
  estimatedMarginPercent: number | null;
};

/**
 * Calcula o preço de um kit/oferta a partir dos itens (CLAUDE.md > Fase 5 >
 * 5). O desconto do template (percent/fixed) é aplicado sobre a soma
 * individual dos itens; nunca sobre o custo.
 */
export function computeOfferPricing(
  items: OfferPricingItem[],
  discount:
    | { type: "percent"; value: number }
    | { type: "fixed"; value: number }
    | null,
): OfferPricing {
  const individualSumCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const estimatedCostCents = items.reduce(
    (sum, item) => sum + item.unitCostCents * item.quantity,
    0,
  );

  let discountCents = 0;
  if (discount?.type === "percent") {
    discountCents = Math.round((individualSumCents * discount.value) / 100);
  } else if (discount?.type === "fixed") {
    discountCents = Math.round(discount.value);
  }
  // Nunca deixa o desconto virar preço negativo.
  discountCents = Math.min(discountCents, individualSumCents);

  const finalPriceCents = individualSumCents - discountCents;
  const estimatedProfitCents = finalPriceCents - estimatedCostCents;
  const estimatedMarginPercent =
    finalPriceCents > 0 ? (estimatedProfitCents / finalPriceCents) * 100 : null;

  return {
    individualSumCents,
    discountCents,
    finalPriceCents,
    estimatedCostCents,
    estimatedProfitCents,
    estimatedMarginPercent,
  };
}
