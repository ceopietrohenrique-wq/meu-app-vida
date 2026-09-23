import { describe, expect, it } from "vitest";

import manifest from "./manifest";

/**
 * Fase 8 > Instalabilidade: garante que o manifest continua tendo todos os
 * campos obrigatórios para instalação (name/short_name/start_url/display/
 * icons/theme_color/background_color) e que os ícones cobrem os tamanhos
 * mínimos (192/512) + a variante maskable exigida pelos critérios de PWA
 * instalável do Chrome/Lighthouse.
 */
describe("manifest", () => {
  const result = manifest();

  it("tem os campos obrigatórios de instalabilidade", () => {
    expect(result.name).toBeTruthy();
    expect(result.short_name).toBeTruthy();
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.theme_color).toBeTruthy();
    expect(result.background_color).toBeTruthy();
  });

  it("start_url aponta para uma rota que existe (nunca uma rota inexistente)", () => {
    // "/" é a Tela Hoje — sempre existe para usuário autenticado (e
    // redireciona para /login quando não há sessão, nunca 404).
    expect(result.start_url).toBe("/");
  });

  it("inclui ícone 192x192 e 512x512 com type image/png", () => {
    const icons = result.icons ?? [];
    const has192 = icons.some(
      (icon) => icon.sizes === "192x192" && icon.type === "image/png",
    );
    const has512 = icons.some(
      (icon) => icon.sizes === "512x512" && icon.type === "image/png",
    );
    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });

  it("inclui uma entrada de ícone maskable", () => {
    const icons = result.icons ?? [];
    const hasMaskable = icons.some((icon) => icon.purpose === "maskable");
    expect(hasMaskable).toBe(true);
  });

  it("todo ícone tem src, sizes e type preenchidos (nunca um placeholder quebrado)", () => {
    const icons = result.icons ?? [];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.src.startsWith("/")).toBe(true);
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBe("image/png");
    }
  });
});
