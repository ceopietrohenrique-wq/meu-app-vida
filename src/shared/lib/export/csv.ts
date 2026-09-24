/**
 * Serialização CSV (RFC 4180): vírgula como separador de campo, ponto como
 * separador decimal (padrão internacional, sem ambiguidade — Excel e
 * LibreOffice em qualquer locale importam corretamente com "delimitado por
 * vírgula"). BOM UTF-8 no início do arquivo para o Excel detectar a
 * codificação automaticamente (sem o BOM, acentos quebram no Excel do
 * Windows, que assume Latin-1 por padrão sem essa marca).
 */

const UTF8_BOM = "﻿";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // RFC 4180: só precisa citar (") o campo se ele contém vírgula, aspas ou
  // quebra de linha — aspas internas são duplicadas ("" escapa ").
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Monta o texto CSV completo a partir de cabeçalho + linhas. Nunca lança —
 * um dataset vazio ainda produz um CSV válido (só cabeçalho), nunca um
 * arquivo corrompido/vazio de verdade.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(","));
  }
  // \r\n é o quebra-linha padrão do RFC 4180 — mais compatível com Excel
  // que \n sozinho.
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

/**
 * Dispara o download de um arquivo de texto no browser via Blob + link
 * temporário — nunca envia o conteúdo pra fora da aplicação (gerado e
 * baixado inteiramente no client, ver docs/business-rules.md > Exportação).
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
