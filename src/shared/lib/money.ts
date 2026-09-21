/**
 * Dinheiro é sempre representado, dentro da aplicação, como um inteiro de
 * centavos — nunca `number` fracionário. Isso evita os erros de
 * arredondamento clássicos de ponto flutuante (`0.1 + 0.2 !== 0.3`) em somas
 * repetidas (dashboard, orçamento). O Postgres continua sendo a fonte de
 * verdade com `numeric` (nunca float); os valores chegam do banco como
 * string (ex.: `"123.45"`) e são convertidos aqui, num único lugar
 * centralizado (CLAUDE.md > Fase 4 > 1).
 */

const CENTS_PER_UNIT = 100;

/**
 * Converte um valor monetário vindo do Postgres (`numeric`, chega como
 * string ou number via supabase-js) para centavos inteiros — parse baseado
 * em string, nunca em multiplicação de float, para não introduzir erro de
 * arredondamento na conversão.
 */
export function parseMoneyToCents(value: string | number): number {
  const text = typeof value === "number" ? value.toString() : value.trim();
  const match = /^-?\d+(\.\d+)?$/.exec(text);
  if (!match) return 0;

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const fractionCents = (fractionPart + "00").slice(0, 2);

  const cents = Number(wholePart) * CENTS_PER_UNIT + Number(fractionCents);
  if (!Number.isFinite(cents)) return 0;

  return negative ? -cents : cents;
}

/**
 * Converte centavos inteiros de volta para a string decimal que o Postgres
 * (`numeric`) espera receber (ex.: `1050` → `"10.50"`).
 */
export function centsToDecimalString(cents: number): string {
  if (!Number.isFinite(cents)) return "0.00";
  const roundedCents = Math.round(cents);
  const negative = roundedCents < 0;
  const absCents = Math.abs(roundedCents);
  const whole = Math.floor(absCents / CENTS_PER_UNIT);
  const fraction = (absCents % CENTS_PER_UNIT).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Formata centavos como moeda BRL para exibição. Nunca retorna
 * NaN/Infinity — entrada inválida vira R$ 0,00 (nunca quebra a UI).
 */
export function formatCurrencyBRL(cents: number): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(safeCents / CENTS_PER_UNIT);
}
