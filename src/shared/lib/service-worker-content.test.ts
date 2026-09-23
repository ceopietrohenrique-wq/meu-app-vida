import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Fase 8 > Service worker: guarda de regressão estática — `public/sw.js` é
 * servido direto (fora do build TS/bundler), então só um teste que lê o
 * arquivo pega uma edição futura que remova sem querer o push/
 * notificationclick (Fase 7) enquanto mexe em cache/offline (Fase 8), ou
 * que esqueça de versionar o cache.
 */
describe("public/sw.js", () => {
  const content = readFileSync(
    resolve(__dirname, "../../../public/sw.js"),
    "utf8",
  );

  it("preserva os listeners de Web Push da Fase 7", () => {
    expect(content).toContain('self.addEventListener("push"');
    expect(content).toContain('self.addEventListener("notificationclick"');
  });

  it("preserva o app shell / offline da Fase 0", () => {
    expect(content).toContain('self.addEventListener("install"');
    expect(content).toContain('self.addEventListener("activate"');
    expect(content).toContain('self.addEventListener("fetch"');
    expect(content).toContain("OFFLINE_URL");
  });

  it("tem um CACHE_NAME versionado (nunca um nome fixo sem versão)", () => {
    const match = content.match(/CACHE_NAME\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/-v\d+$/);
  });

  it("activate limpa caches com nome diferente do atual (nunca acumula versão antiga)", () => {
    expect(content).toContain("caches.delete");
    expect(content).toContain("key !== CACHE_NAME");
  });

  it("nunca intercepta requests de outra origem (nunca cacheia resposta do Supabase)", () => {
    expect(content).toContain("url.origin !== self.location.origin");
  });

  it("nunca intercepta métodos que não são GET (mutations sempre vão direto pra rede)", () => {
    expect(content).toContain('request.method !== "GET"');
  });

  it("push nunca quebra em payload inválido (sempre tem fallback)", () => {
    expect(content).toMatch(/catch\s*\{/);
    expect(content).toContain("Nova notificação");
  });
});
