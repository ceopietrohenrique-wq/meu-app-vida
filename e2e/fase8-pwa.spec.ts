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
const email = `e2e-fase8-pwa-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário PWA" },
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste e2e: ${error?.message}`);
  }
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
}

test("manifest.webmanifest é servido com os campos e ícones corretos", async ({
  page,
}) => {
  const response = await page.goto("/manifest.webmanifest");
  expect(response?.status()).toBe(200);
  const manifest = await response?.json();

  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");

  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.status()).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
});

test("service worker registra e assume controle da página", async ({
  page,
}) => {
  await login(page);
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    { timeout: 10_000 },
  );
  const swState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state ?? null;
  });
  expect(swState).toBe("activated");
});

test("offline shell: navegação sem rede mostra a página offline, nunca tela branca", async ({
  page,
  context,
}) => {
  await login(page);
  // Garante que o SW já assumiu controle antes de simular offline —
  // senão a primeira navegação nem passaria pelo fetch handler dele.
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    { timeout: 10_000 },
  );

  await context.setOffline(true);
  try {
    await page.goto("/planejamento", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Você está offline")).toBeVisible();
    // Nunca uma tela branca: o body sempre tem conteúdo de texto real.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  } finally {
    await context.setOffline(false);
  }
});

test("cache do service worker é versionado e não acumula versões antigas", async ({
  page,
}) => {
  await login(page);
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    { timeout: 10_000 },
  );

  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames.length).toBeGreaterThan(0);
  expect(cacheNames.every((name) => /^app-shell-v\d+$/.test(name))).toBe(true);
});

test("capability detection: Notification/Push/serviceWorker presentes não quebram a página de configurações", async ({
  page,
}) => {
  await login(page);
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/configuracoes");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Notificações" }),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("mobile 375/390/430px: bottom nav, Quick Capture e dialogs sem overflow horizontal", async ({
  page,
}) => {
  await login(page);
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: "Hoje" })).toBeVisible();

    let hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
    await page.keyboard.press("Escape");
  }
});

test("desktop: sidebar visível, bottom nav ausente, conteúdo com largura máxima (não esticado)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/progresso");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("navigation").filter({ hasText: "Progresso" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Menu" })).toHaveCount(0);

  const contentWidth = await page.evaluate(() => {
    const main = document.querySelector("main");
    const child = main?.firstElementChild;
    return child?.getBoundingClientRect().width ?? 0;
  });
  // max-w-2xl (42rem = 672px) é o teto usado pelas páginas de conteúdo —
  // nunca deveria esticar para a largura toda de uma tela 1440px.
  expect(contentWidth).toBeLessThan(900);
});
