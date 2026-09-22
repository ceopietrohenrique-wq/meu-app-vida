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
const email = `e2e-fase6-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 6" },
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
  await page.goto("/progresso");
  await page.waitForLoadState("networkidle");
});

test("criar meta trimestral e concluí-la desbloqueia a conquista correspondente", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova meta trimestral" }).click();
  await page.getByLabel("Título").fill("Validar meu negócio");
  await page.getByLabel("Início").fill("2026-01-01");
  await page.getByLabel("Fim").fill("2026-03-31");
  await page.getByRole("button", { name: "Criar meta" }).click();
  await expect(page.getByText("Meta trimestral criada.")).toBeVisible();

  const goalsCard = page.locator("#metas-trimestrais");
  await expect(goalsCard.getByText("Validar meu negócio")).toBeVisible();

  const goalRow = goalsCard.locator("li", { hasText: "Validar meu negócio" });
  await goalRow.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByText("Meta trimestral concluída!")).toBeVisible();

  const { data: goal } = await admin
    .from("goals")
    .select("is_completed")
    .eq("user_id", userId)
    .eq("title", "Validar meu negócio")
    .single();
  expect(goal?.is_completed).toBe(true);

  const achievementsCard = page.locator("#conquistas");
  await expect(
    achievementsCard.getByText("Visão de longo prazo"),
  ).toBeVisible();

  const { data: achievement } = await admin
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_key", "meta_trimestral_concluida")
    .maybeSingle();
  expect(achievement).not.toBeNull();
});

test("revisão semanal calcula o resumo e salva as respostas de reflexão", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Revisão semanal" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("XP", { exact: true })).toBeVisible();

  await page
    .getByLabel("O que funcionou bem?")
    .fill("Mantive a rotina de tarefas em dia.");
  await page
    .getByLabel("Qual minha prioridade na próxima semana?")
    .fill("Fechar a proposta do cliente X.");
  await page.getByRole("button", { name: "Salvar revisão" }).click();
  await expect(page.getByText("Revisão semanal salva.")).toBeVisible();

  const { data: review } = await admin
    .from("weekly_reviews")
    .select("what_worked, next_week_priority")
    .eq("user_id", userId)
    .single();
  expect(review?.what_worked).toBe("Mantive a rotina de tarefas em dia.");
  expect(review?.next_week_priority).toBe("Fechar a proposta do cliente X.");
});

test("criar recompensa e resgatar registra o histórico", async ({ page }) => {
  // Ganha 10 XP de verdade (concluindo uma tarefa) para a recompensa ficar
  // disponível — "disponível" é sempre calculado a partir do XP real, nunca
  // um saldo mutável (ver domains/xp/components/rewards-card.tsx).
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill("Tarefa para recompensa e2e");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.getByText("Tarefa criada.")).toBeVisible();
  await page
    .locator("li", { hasText: "Tarefa para recompensa e2e" })
    .getByRole("button", { name: "Concluir tarefa" })
    .click();
  await expect(page.getByText("Tarefa concluída. +10 XP")).toBeVisible();

  await page.goto("/progresso");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Nova recompensa" }).click();
  await page.getByLabel("Nome").fill("Assistir um filme");
  await page.getByLabel("Custo em XP").fill("10");
  await page.getByRole("button", { name: "Criar recompensa" }).click();
  await expect(page.getByText("Recompensa criada.")).toBeVisible();

  const rewardsCard = page.locator("#recompensas");
  await expect(rewardsCard.getByText("Assistir um filme")).toBeVisible();

  const rewardRow = rewardsCard.locator("li", { hasText: "Assistir um filme" });
  await rewardRow.getByRole("button", { name: "Resgatar" }).click();
  await expect(page.getByText('"Assistir um filme" resgatada.')).toBeVisible();

  const { data: redemptions } = await admin
    .from("reward_redemptions")
    .select("id, xp_total_at_redemption")
    .eq("user_id", userId);
  expect(redemptions).toHaveLength(1);
  expect(redemptions![0]!.xp_total_at_redemption).toBe(10);
});

test("busca global (Cmd/Ctrl+K) encontra uma tarefa e navega até ela", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await admin.from("tasks").insert({
    user_id: userId,
    title: "Tarefa buscável e2e",
    priority: "media",
    xp_reward: 10,
  });

  await page.getByRole("button", { name: "Busca global" }).click();
  await page
    .getByPlaceholder("Buscar tarefas, clientes, notas, catálogo…")
    .fill("buscável");
  await expect(page.getByText("Tarefa buscável e2e")).toBeVisible();

  await page.getByText("Tarefa buscável e2e").click();
  await expect(page).toHaveURL("/");
});

test("bottom nav mobile mostra Progresso real e agrupa o resto em Menu", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Bottom nav só existe em mobile.");

  await expect(page.getByRole("link", { name: "Progresso" })).toBeVisible();

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("link", { name: "Saúde" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();

  await page.getByRole("link", { name: "Saúde" }).click();
  await expect(page).toHaveURL("/saude");
});
