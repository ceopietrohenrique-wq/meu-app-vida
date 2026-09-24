/**
 * Espelha, em TS puro e testável, as mesmas fórmulas usadas pela RPC
 * get_business_dashboard_summary (docs/business-rules.md > Fase 5 >
 * Definições dos indicadores) — nunca duas fontes de verdade divergentes,
 * mas a lógica pura fica aqui para ter cobertura de teste unitário com
 * valores exatos, sem depender do banco (CLAUDE.md > Fase 5 > 12).
 *
 * `computeGrossProfitCents`/`computeMarginPercent` moraram aqui até a
 * auditoria pós-Fase 8 (exportação de vendas): re-exportadas de
 * `domains/sales/utils/sale-indicators.ts`, o dono natural do conceito,
 * pra não duplicar a fórmula — este arquivo mantém a mesma API pública de
 * antes (nenhum import existente quebra).
 */

export {
  computeGrossProfitCents,
  computeMarginPercent,
} from "@/domains/sales/utils/sale-indicators";

export function computeNetProfitCents(
  grossProfitCents: number,
  operatingExpensesCents: number,
  feesCents: number,
): number {
  return grossProfitCents - operatingExpensesCents - feesCents;
}

/**
 * ROI = lucro bruto / custo direto × 100 (proxy de retorno sobre o
 * investimento em custo direto — não há rastreamento de investimento
 * dedicado nesta fase, ver docs/architecture.md). Nunca calculável sem
 * custo direto identificável.
 */
export function computeRoiPercent(
  grossProfitCents: number,
  directCostsCents: number,
): number | null {
  if (directCostsCents <= 0) return null;
  return (grossProfitCents / directCostsCents) * 100;
}

/** Ticket médio = receita líquida / quantidade de vendas concluídas. */
export function computeAverageTicketCents(
  netRevenueCents: number,
  salesCount: number,
): number | null {
  if (salesCount <= 0) return null;
  return netRevenueCents / salesCount;
}

/** Conversão = clientes fechados / leads do período × 100. */
export function computeConversionPercent(
  closedCount: number,
  leadsCount: number,
): number | null {
  if (leadsCount <= 0) return null;
  return (closedCount / leadsCount) * 100;
}
