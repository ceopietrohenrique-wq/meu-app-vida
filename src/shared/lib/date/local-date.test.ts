import { describe, expect, it } from "vitest";

import { toLocalDateString } from "./local-date";

describe("toLocalDateString", () => {
  it("converte um instante UTC para a data local correta em um fuso atrasado", () => {
    // 2026-01-15T02:00:00Z é ainda 2026-01-14 em America/Sao_Paulo (UTC-3).
    const date = new Date("2026-01-15T02:00:00.000Z");
    expect(toLocalDateString(date, "America/Sao_Paulo")).toBe("2026-01-14");
  });

  it("mantém a mesma data quando o horário UTC já corresponde ao dia local", () => {
    const date = new Date("2026-01-15T15:00:00.000Z");
    expect(toLocalDateString(date, "America/Sao_Paulo")).toBe("2026-01-15");
  });

  it("funciona para UTC puro", () => {
    const date = new Date("2026-01-15T23:30:00.000Z");
    expect(toLocalDateString(date, "UTC")).toBe("2026-01-15");
  });
});
