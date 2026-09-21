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
const email = `e2e-fase1-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 1" },
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

test("criar tarefa, concluir e ganhar XP uma única vez mesmo clicando duas vezes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova tarefa" }).click();
  await page.getByLabel("Título").fill("Tarefa do teste e2e");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.getByText("Tarefa criada.")).toBeVisible();

  const taskItem = page.locator("li", { hasText: "Tarefa do teste e2e" });
  const checkbox = taskItem.getByRole("button", { name: "Concluir tarefa" });
  await checkbox.click();
  await expect(page.getByText("Tarefa concluída. +10 XP")).toBeVisible();

  const { data: task } = await admin
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("title", "Tarefa do teste e2e")
    .single();
  const sourceKey = `TASK_COMPLETED:${task!.id}`;

  async function xpEventCount() {
    const { data } = await admin
      .from("xp_events")
      .select("id")
      .eq("user_id", userId)
      .eq("source_key", sourceKey);
    return data?.length ?? 0;
  }

  expect(await xpEventCount()).toBe(1);

  // Reabrir e concluir de novo não pode gerar um segundo evento de XP — a
  // prova real (constraint UNIQUE no banco) já está em
  // supabase/tests/xp-idempotency.test.ts; aqui confirmamos que o fluxo
  // completo via UI também respeita isso.
  await taskItem.getByRole("button", { name: "Reabrir tarefa" }).click();
  await taskItem.getByRole("button", { name: "Concluir tarefa" }).click();
  await expect(
    taskItem.getByRole("button", { name: "Reabrir tarefa" }),
  ).toBeVisible();
  expect(await xpEventCount()).toBe(1);
});

test("criar hábito e marcar como concluído hoje", async ({ page }) => {
  await page.getByRole("button", { name: "Novo hábito" }).click();
  await page.getByLabel("Nome").fill("Beber água (e2e)");
  await page.getByRole("button", { name: "Salvar hábito" }).click();
  await expect(page.getByText("Hábito criado.")).toBeVisible();

  const habitItem = page.locator("li", { hasText: "Beber água (e2e)" });
  await habitItem.getByRole("button", { name: "Concluir hábito" }).click();
  await expect(page.getByText(/Hábito concluído\. \+\d+ XP/)).toBeVisible();
});

test("quick capture envia item para a inbox e ele pode virar tarefa", async ({
  page,
}) => {
  await page
    .locator('button[aria-label="Capturar rapidamente"]:visible')
    .first()
    .click();
  await page.getByRole("button", { name: "Adicionar à inbox" }).click();
  await page
    .getByPlaceholder("Anote agora, organize depois…")
    .fill("Ideia capturada no e2e");
  await page.getByRole("button", { name: "Salvar na inbox" }).click();
  await expect(page.getByText("Adicionado à inbox.")).toBeVisible();

  // Navega direto por URL em vez de clicar no link "Inbox" da bottom nav:
  // o toast de sucesso pode sobrepor essa área da tela, e o link em si já
  // é coberto pelo teste de navegação de outra suíte.
  await page.goto("/inbox");
  await expect(page.getByText("Ideia capturada no e2e")).toBeVisible();

  await page.getByRole("button", { name: "Transformar em tarefa" }).click();
  await expect(page.getByText("Transformado em tarefa.")).toBeVisible();
  await expect(page.getByText("Ideia capturada no e2e")).not.toBeVisible();
});

test("planejamento semanal salva as prioridades da semana", async ({
  page,
}) => {
  await page.locator("a:visible", { hasText: "Planejamento" }).first().click();
  await expect(page).toHaveURL("/planejamento");

  await page
    .getByPlaceholder("Prioridade 1")
    .fill("Fechar o módulo de tarefas");
  await page.getByRole("button", { name: "Salvar planejamento" }).click();
  await expect(page.getByText("Planejamento da semana salvo.")).toBeVisible();

  await page.reload();
  await expect(page.getByPlaceholder("Prioridade 1")).toHaveValue(
    "Fechar o módulo de tarefas",
  );
});

test("encerramento do dia mostra o resumo do dia", async ({ page }) => {
  await page.getByRole("button", { name: "Encerrar o dia" }).click();
  await expect(page.getByText("Encerramento do dia")).toBeVisible();
  await expect(page.getByText("XP ganho hoje")).toBeVisible();
  await page.getByRole("button", { name: "Salvar revisão" }).click();
  await expect(page.getByText("Revisão do dia salva.")).toBeVisible();
});
