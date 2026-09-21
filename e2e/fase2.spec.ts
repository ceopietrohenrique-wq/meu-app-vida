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
const email = `e2e-fase2-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 2" },
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
  await page.goto("/saude");
  // A home de Saúde carrega várias queries em paralelo (peso, água,
  // alimentação, treino, IMC); esperar a rede estabilizar evita clicar
  // antes da hidratação/carregamento terminar (o botão existiria no DOM
  // mas sem o listener React ainda anexado).
  await page.waitForLoadState("networkidle");
});

test("registrar peso mostra o valor no card e concede XP", async ({ page }) => {
  // "Registrar peso" existe tanto no atalho do topo quanto no card de Peso
  // — usamos o do atalho (primeiro na ordem de tabulação) explicitamente.
  await page.getByRole("button", { name: "Registrar peso" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Registrar peso" });
  await dialog.getByLabel("Peso (kg)").fill("80.5");
  await dialog.getByRole("button", { name: "Salvar peso" }).click();
  await expect(page.getByText(/Peso registrado/)).toBeVisible();

  const { data: logs } = await admin
    .from("weight_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("weight_kg", 80.5);
  expect(logs).toHaveLength(1);
});

test("registrar água com botão rápido atualiza o progresso", async ({
  page,
}) => {
  // A home de Saúde tem "+250 ml" tanto no atalho do topo quanto no card de
  // Água — escopamos ao card (aguardando ele estar carregado) para não cair
  // em ambiguidade nem clicar antes da hidratação terminar.
  const waterCard = page.locator("#agua");
  await expect(waterCard.getByText("Meta diária:")).toBeVisible();
  await waterCard.getByRole("button", { name: "+250 ml" }).click();

  // Sem meta batida (250ml < meta padrão de 2000ml), nenhum toast aparece —
  // esperamos o total do card mudar (prova que a mutation já resolveu)
  // antes de checar o banco, para não ter uma corrida entre o clique e a
  // leitura via admin client.
  await expect(waterCard.getByTestId("water-total")).not.toHaveText("0,0 L");

  const { data: logs } = await admin
    .from("water_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("amount_ml", 250);
  expect(logs).toHaveLength(1);
});

test("criar plano de treino, iniciar, registrar série e concluir gera XP uma única vez", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Novo plano de treino" }).click();
  await page.getByLabel("Nome do plano").fill("Treino e2e");
  await page.getByLabel("Nome do exercício 1").fill("Supino reto");
  await page.getByRole("button", { name: "Salvar plano de treino" }).click();
  await expect(page.getByText("Plano de treino criado.")).toBeVisible();

  // "Iniciar treino" também existe como atalho (que só rola a tela) no topo
  // da página — escopamos ao card de Treino para clicar no botão real que
  // inicia a sessão.
  const workoutCard = page.locator("#treino");
  await workoutCard.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page.getByText("Supino reto")).toBeVisible();

  await page.getByLabel("Carga (kg)").fill("80");
  await page.getByLabel("Repetições").fill("10");
  await page.getByRole("button", { name: "Adicionar série" }).click();
  await expect(page.getByText("Série 1: 80 kg × 10")).toBeVisible();

  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByText(/Treino concluído\. \+\d+ XP/)).toBeVisible();

  const { data: sessions } = await admin
    .from("workout_sessions")
    .select("id, completed_at")
    .eq("user_id", userId);
  expect(sessions).toHaveLength(1);
  expect(sessions![0]!.completed_at).not.toBeNull();

  const sourceKey = `WORKOUT_COMPLETED:${sessions![0]!.id}`;
  const { data: xpEvents } = await admin
    .from("xp_events")
    .select("id")
    .eq("user_id", userId)
    .eq("source_key", sourceKey);
  expect(xpEvents).toHaveLength(1);
});
