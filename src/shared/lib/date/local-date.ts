/**
 * Data local (yyyy-MM-dd) de um instante num timezone IANA arbitrário, sem
 * depender de bibliotecas externas de timezone — usa Intl, disponível em
 * todos os runtimes-alvo (browser moderno e Node). Central para nunca
 * deslocar eventos diários (ex.: habit_logs) por erro de fuso/UTC.
 */
export function toLocalDateString(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function todayLocalDateString(timeZone: string): string {
  return toLocalDateString(new Date(), timeZone);
}

/**
 * Converte uma string `yyyy-MM-dd` num `Date` usando o construtor LOCAL
 * (ano, mês, dia), nunca `new Date(dateOnly)` — que interpreta a string
 * como meia-noite UTC e, em timezones atrás de UTC (ex.: Brasil, UTC-3),
 * desloca o dia 1 do mês para o dia 28/30/31 do mês anterior ao exibir em
 * hora local, corrompendo `startOfMonth`/`endOfMonth`/`format(..., "yyyy-MM")`
 * calculados a partir dele.
 */
export function parseLocalDateOnly(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}
