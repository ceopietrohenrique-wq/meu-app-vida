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
const email = `e2e-fase7-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 7" },
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste e2e: ${error?.message}`);
  }
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["notifications"]).catch(() => {
    // Alguns projetos Playwright (ex.: webkit) não suportam grant de
    // permissão de notificação — o teste segue sem depender disso.
  });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/configuracoes");
  await page.waitForLoadState("networkidle");
});

test("preferências de notificação: alterar categorias e horário silencioso persiste", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Notificações" }),
  ).toBeVisible();

  await page.getByLabel("Água").uncheck();
  await page.getByLabel("Não enviar push fora do horário abaixo").check();

  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect(
    page.getByText("Preferências de notificação salvas."),
  ).toBeVisible();

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("water_enabled, quiet_hours_enabled")
    .eq("user_id", userId)
    .single();
  expect(prefs?.water_enabled).toBe(false);
  expect(prefs?.quiet_hours_enabled).toBe(true);

  // Recarregar reflete o que foi salvo (não é só estado local do form).
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Água")).not.toBeChecked();
});

test("presets de intensidade ajustam várias categorias de uma vez", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Essencial" }).click();
  await expect(page.getByLabel("Água")).not.toBeChecked();
  await expect(page.getByLabel("Tarefas")).toBeChecked();

  await page.getByRole("button", { name: "Intenso" }).click();
  await expect(page.getByLabel("Água")).toBeChecked();
  await expect(page.getByLabel("Peso")).toBeChecked();
});

test("interface de preferências funciona em larguras mobile (375/390/430px), sem overflow horizontal", async ({
  page,
}) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(
      page.getByRole("heading", { name: "Notificações" }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});
