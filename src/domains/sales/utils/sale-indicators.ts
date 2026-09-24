/**
 * Lucro bruto/margem por venda — a mesma fórmula usada pela RPC
 * get_business_dashboard_summary (docs/business-rules.md > Fase 5 >
 * Definições dos indicadores) e por CSV de exportação de vendas (Auditoria
 * pós-Fase 8 > Exportação). Movida de `domains/business/utils/` pra cá
 * porque `sales` é o dono natural do conceito (calculado a partir dos
 * campos da própria tabela `sales`) e agora um segundo consumidor (export)
 * precisava dela — mesmo padrão de promoção já usado para
 * `shared/lib/streak.ts` (nunca um domínio importa util "interno" de
 * outro; quando 2+ precisam do mesmo cálculo puro, ele sobe pro dono mais
 * natural do conceito).
 */

export function computeGrossProfitCents(
  netRevenueCents: number,
  directCostsCents: number,
): number {
  return netRevenueCents - directCostsCents;
}

/** Margem = lucro bruto / receita líquida × 100. Nunca divide por zero. */
export function computeMarginPercent(
  grossProfitCents: number,
  netRevenueCents: number,
): number | null {
  if (netRevenueCents <= 0) return null;
  return (grossProfitCents / netRevenueCents) * 100;
}
