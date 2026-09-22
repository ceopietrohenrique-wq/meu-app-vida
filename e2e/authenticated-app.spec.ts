import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

const admin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let userId: string;
const email = `e2e-${Date.now()}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário E2E" },
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste e2e: ${error?.message}`);
  }
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
});

test("login, navegação pelo shell protegido, edição de perfil e logout", async ({
  page,
  isMobile,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Olá, Usuário E2E" }),
  ).toBeVisible();

  // Navegação principal leva a Configurações sem recarregar a proteção de
  // rota. No desktop, o link já está na sidebar; no mobile (desde a Fase 6),
  // Configurações mora dentro do sheet "Menu" (5º slot da bottom nav —
  // CLAUDE.md > NAVEGAÇÃO), então precisa abrir o sheet primeiro.
  if (isMobile) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL("/configuracoes");

  const nameInput = page.getByLabel("Nome");
  await expect(nameInput).toHaveValue("Usuário E2E");
  await nameInput.fill("Usuário E2E Editado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  // Sessão realmente encerrada: voltar para "/" exige login de novo.
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
