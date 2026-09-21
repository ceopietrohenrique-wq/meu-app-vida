import { describe, expect, it } from "vitest";

import { getWeekStartDate } from "./week";

describe("getWeekStartDate", () => {
  // 2026-01-15 é uma quinta-feira (dow=4).
  it("com semana começando no domingo (0)", () => {
    expect(getWeekStartDate("2026-01-15", 0)).toBe("2026-01-11");
  });

  it("com semana começando na segunda (1)", () => {
    expect(getWeekStartDate("2026-01-15", 1)).toBe("2026-01-12");
  });

  it("retorna a própria data quando ela já é o início da semana", () => {
    expect(getWeekStartDate("2026-01-12", 1)).toBe("2026-01-12");
  });
});
