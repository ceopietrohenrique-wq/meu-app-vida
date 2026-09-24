import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("produz cabeçalho + linhas separados por vírgula, com BOM UTF-8 e CRLF", () => {
    const csv = toCsv(
      ["data", "descrição", "valor"],
      [["2026-09-23", "Mercado", "150.50"]],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("data,descrição,valor\r\n");
    expect(csv).toContain("2026-09-23,Mercado,150.50\r\n");
  });

  it("escapa campo com vírgula entre aspas", () => {
    const csv = toCsv(["descrição"], [["Padaria, mercearia"]]);
    expect(csv).toContain('"Padaria, mercearia"');
  });

  it("escapa aspas internas duplicando-as", () => {
    const csv = toCsv(["descrição"], [['Compra "especial"']]);
    expect(csv).toContain('"Compra ""especial"""');
  });

  it("escapa quebra de linha dentro do campo", () => {
    const csv = toCsv(["observação"], [["linha 1\nlinha 2"]]);
    expect(csv).toContain('"linha 1\nlinha 2"');
  });

  it("preserva decimal como string, sem arredondamento nem notação científica", () => {
    const csv = toCsv(["valor"], [["1234567.89"]]);
    expect(csv).toContain("1234567.89");
    expect(csv).not.toContain("e+");
  });

  it("campo null/undefined vira string vazia, nunca a palavra 'null'", () => {
    const csv = toCsv(["observação"], [[null], [undefined]]);
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
  });

  it("dataset vazio produz CSV válido só com cabeçalho", () => {
    const csv = toCsv(["data", "valor"], []);
    expect(csv).toBe("﻿data,valor\r\n");
  });
});
