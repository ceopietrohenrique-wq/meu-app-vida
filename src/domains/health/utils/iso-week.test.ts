import { describe, expect, it } from "vitest";

import { isoWeekKey } from "./iso-week";

describe("isoWeekKey", () => {
  it("gera a mesma chave para datas na mesma semana ISO", () => {
    // Segunda 2026-01-26 até domingo 2026-02-01 são a mesma semana ISO.
    expect(isoWeekKey("2026-01-26")).toBe(isoWeekKey("2026-01-28"));
    expect(isoWeekKey("2026-01-26")).toBe("2026-W05");
  });

  it("gera chaves diferentes em semanas ISO diferentes", () => {
    expect(isoWeekKey("2026-01-25")).not.toBe(isoWeekKey("2026-01-26"));
  });
});
