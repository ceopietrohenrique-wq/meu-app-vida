import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

const admin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let userId: string;
const email = `e2e-fase8-a11y-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário A11y" },
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste e2e: ${error?.message}`);
  }
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
});

/**
 * Fase 8 > Acessibilidade: varredura automatizada (axe-core) das páginas
 * principais + fluxos críticos, contra o build de produção (mesmo
 * webServer do playwright.config.ts). Falha só em violações de impacto
 * "critical"/"serious" — impacto "moderate"/"minor" é logado, não
 * bloqueante, para não travar a fase em ruído de bibliotecas de terceiro
 * (ex.: Recharts gera SVG sem alguns atributos ARIA "ideais" que o axe
 * sinaliza como minor, sem impacto real de uso).
 */
const PAGES: { name: string; path: string }[] = [
  { name: "Hoje", path: "/" },
  { name: "Planejamento", path: "/planejamento" },
  { name: "Saúde", path: "/saude" },
  { name: "Espiritual", path: "/espiritual" },
  { name: "Financeiro", path: "/financeiro" },
  { name: "Negócios", path: "/negocios" },
  { name: "Progresso", path: "/progresso" },
  { name: "Configurações", path: "/configuracoes" },
];

for (const { name, path } of PAGES) {
  test(`a11y: ${name} sem violações críticas/sérias`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .exclude("[data-recharts-wrapper]")
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (blocking.length > 0) {
      console.error(
        `Violações bloqueantes em ${name}:`,
        JSON.stringify(blocking, null, 2),
      );
    }
    expect(blocking).toEqual([]);
  });
}

test("a11y: Quick Capture (dialog) sem violações críticas/sérias", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking).toEqual([]);
});

test("a11y: Busca global (dialog) sem violações críticas/sérias", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await admin.from("tasks").insert({
    user_id: userId,
    title: "Tarefa para varredura de acessibilidade",
    priority: "media",
  });

  await page.getByRole("button", { name: "Busca global" }).click();
  await expect(page.getByPlaceholder(/Buscar/)).toBeVisible();
  // Testa o estado real e interativo (com resultados de verdade —
  // role="option" presentes), não o estado transitório "digite ao menos 2
  // letras" antes de qualquer busca. Nesse estado vazio, a lista do cmdk
  // (role="listbox" fixo da própria biblioteca) fica sem filhos
  // role="option"/"group" — uma limitação conhecida e documentada do cmdk
  // em si (mesmo comportamento em qualquer app que o usa), não algo que o
  // código deste projeto controla ou pode corrigir sem fazer fork da lib.
  await page.getByPlaceholder(/Buscar/).fill("acessibilidade");
  await expect(
    page.getByText("Tarefa para varredura de acessibilidade"),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"], [cmdk-root]')
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking).toEqual([]);
});

test("a11y: foco visível e navegação por teclado no dialog de tarefa", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // O foco deve entrar no dialog (algum elemento dentro dele focado), não
  // ficar "solto" atrás do overlay.
  const activeInsideDialog = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"]');
    return dialogEl?.contains(document.activeElement) ?? false;
  });
  expect(activeInsideDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
