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
const email = `e2e-fase3-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 3" },
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
  await page.goto("/espiritual");
  await page.waitForLoadState("networkidle");
});

test("registrar devocional pelo checklist rápido concede XP", async ({
  page,
}) => {
  const devotionalCard = page.locator("#devocional");
  await expect(
    devotionalCard.getByText("Devocional", { exact: true }),
  ).toBeVisible();

  await devotionalCard.getByRole("button", { name: "Li a passagem" }).click();
  await devotionalCard.getByRole("button", { name: "Refleti" }).click();
  await devotionalCard.getByRole("button", { name: "Orei" }).click();
  await expect(page.getByText(/Devocional concluído\. \+\d+ XP/)).toBeVisible();

  const { data: devotionals } = await admin
    .from("devotionals")
    .select("read_done, reflection_done, prayer_done")
    .eq("user_id", userId)
    .single();
  expect(devotionals).toMatchObject({
    read_done: true,
    reflection_done: true,
    prayer_done: true,
  });

  const { data: xpEvents } = await admin
    .from("xp_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", "DEVOTIONAL");
  expect(xpEvents).toHaveLength(1);
});

test("criar plano de leitura e concluir o dia gera XP uma única vez", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Novo plano de leitura" }).click();
  await page.getByLabel("Nome").fill("Plano e2e");
  await page.getByLabel("Total de dias").fill("30");
  await page.getByRole("button", { name: "Salvar plano" }).click();
  await expect(page.getByText("Plano de leitura criado.")).toBeVisible();

  const readingCard = page.locator("#plano-leitura");
  await readingCard
    .getByRole("button", { name: /Concluir leitura do dia/ })
    .click();
  await expect(
    page.getByText(/Leitura do dia concluída\. \+\d+ XP/),
  ).toBeVisible();
  await expect(
    readingCard.getByText("Leitura de hoje concluída"),
  ).toBeVisible();

  const { data: plans } = await admin
    .from("reading_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Plano e2e");
  const { data: logs } = await admin
    .from("reading_plan_logs")
    .select("id")
    .eq("reading_plan_id", plans![0]!.id);
  expect(logs).toHaveLength(1);
});

test("registrar oração e marcar como respondida mantém histórico", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Registrar oração" }).click();
  await page.getByLabel("Descrição").fill("Pedido de teste e2e");
  await page.getByRole("button", { name: "Salvar oração" }).click();
  await expect(page.getByText("Oração registrada.")).toBeVisible();

  const prayerItem = page.locator("li", { hasText: "Pedido de teste e2e" });
  await prayerItem
    .getByRole("button", { name: "Marcar como respondida" })
    .click();
  await prayerItem.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Oração marcada como respondida.")).toBeVisible();
  await expect(prayerItem.getByText("Respondida")).toBeVisible();

  const { data: prayer } = await admin
    .from("prayers")
    .select("type, requested_at, answered_at")
    .eq("user_id", userId)
    .eq("description", "Pedido de teste e2e")
    .single();
  expect(prayer?.type).toBe("respondida");
  expect(prayer?.requested_at).not.toBeNull();
  expect(prayer?.answered_at).not.toBeNull();
});
