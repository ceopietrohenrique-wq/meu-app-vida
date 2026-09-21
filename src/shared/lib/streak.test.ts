import { describe, expect, it } from "vitest";

import {
  computeBestStreak,
  computeCompletionRate,
  computeCurrentStreak,
  isExpectedDay,
} from "@/shared/lib/streak";

describe("isExpectedDay", () => {
  it("hábito diário espera todo dia", () => {
    expect(isExpectedDay("2026-01-15", "diaria", null)).toBe(true);
  });

  it("hábito com dias específicos só espera os dias configurados", () => {
    // 2026-01-15 é uma quinta-feira (dow=4).
    expect(isExpectedDay("2026-01-15", "dias_da_semana", [1, 3, 5])).toBe(
      false,
    );
    expect(isExpectedDay("2026-01-14", "dias_da_semana", [1, 3, 5])).toBe(true); // quarta
  });
});

describe("computeCurrentStreak — hábito diário", () => {
  it("streak de 3 dias terminando hoje", () => {
    const logs = ["2026-01-13", "2026-01-14", "2026-01-15"];
    expect(computeCurrentStreak(logs, "diaria", null, "2026-01-15")).toBe(3);
  });

  it("não zera o streak se hoje ainda não foi marcado, mas ontem sim", () => {
    const logs = ["2026-01-13", "2026-01-14"];
    expect(computeCurrentStreak(logs, "diaria", null, "2026-01-15")).toBe(2);
  });

  it("zera quando falta um dia no meio", () => {
    const logs = ["2026-01-12", "2026-01-14", "2026-01-15"];
    expect(computeCurrentStreak(logs, "diaria", null, "2026-01-15")).toBe(2);
  });

  it("retorna 0 quando não há log nem hoje nem ontem", () => {
    const logs = ["2026-01-10"];
    expect(computeCurrentStreak(logs, "diaria", null, "2026-01-15")).toBe(0);
  });
});

describe("computeCurrentStreak — dias específicos", () => {
  const daysOfWeek = [1, 3, 5]; // segunda, quarta, sexta

  it("conta apenas os dias esperados, ignorando os demais dias da semana", () => {
    // seg 12, qua 14, sex 16 de 2026-01 marcados; hoje = sex 16.
    const logs = ["2026-01-12", "2026-01-14", "2026-01-16"];
    expect(
      computeCurrentStreak(logs, "dias_da_semana", daysOfWeek, "2026-01-16"),
    ).toBe(3);
  });

  it("quebra a sequência ao faltar um dia esperado", () => {
    // faltou quarta 14; hoje é sexta 16.
    const logs = ["2026-01-12", "2026-01-16"];
    expect(
      computeCurrentStreak(logs, "dias_da_semana", daysOfWeek, "2026-01-16"),
    ).toBe(1);
  });
});

describe("computeBestStreak", () => {
  it("encontra a maior sequência mesmo que não seja a atual", () => {
    // sequência de 3 (10,11,12), depois furo, depois sequência de 1 (15).
    const logs = ["2026-01-10", "2026-01-11", "2026-01-12", "2026-01-15"];
    expect(computeBestStreak(logs, "diaria", null)).toBe(3);
  });

  it("retorna 0 quando não há nenhum log", () => {
    expect(computeBestStreak([], "diaria", null)).toBe(0);
  });
});

describe("computeCompletionRate", () => {
  it("calcula a proporção de dias cumpridos sobre os esperados", () => {
    const logs = ["2026-01-01", "2026-01-02"];
    // diário, período de 4 dias, 2 cumpridos = 50%.
    const rate = computeCompletionRate(
      logs,
      "diaria",
      null,
      "2026-01-01",
      "2026-01-04",
    );
    expect(rate).toBe(0.5);
  });

  it("nunca divide por zero: retorna null quando não há ocorrência esperada no período", () => {
    // hábito de segunda/quarta/sexta, período de um único domingo.
    const rate = computeCompletionRate(
      [],
      "dias_da_semana",
      [1, 3, 5],
      "2026-01-18",
      "2026-01-18",
    );
    expect(rate).toBeNull();
  });
});
