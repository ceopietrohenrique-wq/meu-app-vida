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
