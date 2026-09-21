import { describe, expect, it } from "vitest";

import { generateOccurrenceDates } from "./recurrence";

describe("generateOccurrenceDates", () => {
  it("gera ocorrências diárias respeitando o intervalo", () => {
    const dates = generateOccurrenceDates(
      { frequency: "diaria", interval: 2, startsOn: "2026-01-01" },
      "2026-01-01",
      "2026-01-07",
    );
    expect(dates).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-05",
      "2026-01-07",
    ]);
  });

  it("gera ocorrências semanais no mesmo dia da semana do início", () => {
    const dates = generateOccurrenceDates(
      { frequency: "semanal", interval: 1, startsOn: "2026-01-05" }, // segunda
      "2026-01-01",
      "2026-01-31",
    );
    expect(dates).toEqual([
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
      "2026-01-26",
    ]);
  });

  it("gera ocorrências para dias específicos da semana", () => {
    const dates = generateOccurrenceDates(
      {
        frequency: "dias_da_semana",
        daysOfWeek: [1, 3, 5],
        interval: 1,
        startsOn: "2026-01-01",
      },
      "2026-01-12",
      "2026-01-18",
    );
    // seg=12, qua=14, sex=16 dentro da janela.
    expect(dates).toEqual(["2026-01-12", "2026-01-14", "2026-01-16"]);
  });

  it("nunca gera ocorrência antes de startsOn", () => {
    const dates = generateOccurrenceDates(
      { frequency: "diaria", interval: 1, startsOn: "2026-01-10" },
      "2026-01-01",
      "2026-01-12",
    );
    expect(dates.every((d) => d >= "2026-01-10")).toBe(true);
    expect(dates[0]).toBe("2026-01-10");
  });

  it("nunca gera ocorrência depois de endsOn", () => {
    const dates = generateOccurrenceDates(
      {
        frequency: "diaria",
        interval: 1,
        startsOn: "2026-01-01",
        endsOn: "2026-01-03",
      },
      "2026-01-01",
      "2026-01-31",
    );
    expect(dates).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("chamar a mesma geração duas vezes produz o mesmo resultado (idempotente)", () => {
    const config = {
      frequency: "diaria" as const,
      interval: 1,
      startsOn: "2026-01-01",
    };
    const first = generateOccurrenceDates(config, "2026-01-01", "2026-01-05");
    const second = generateOccurrenceDates(config, "2026-01-01", "2026-01-05");
    expect(first).toEqual(second);
  });
});
