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
const email = `e2e-fase4-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 4" },
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
  await page.goto("/financeiro");
  await page.waitForLoadState("networkidle");
});

test("criar conta e registrar um gasto rápido reflete no saldo e na lista", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Carteira E2E");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();
  await expect(page.getByText("Carteira E2E")).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Valor (R$)").fill("2.00");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Carteira E2E" });
  await page.getByLabel("Descrição").fill("Bala");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação registrada.")).toBeVisible();

  const transactionsCard = page.locator("#transacoes");
  await expect(transactionsCard.getByText("Bala")).toBeVisible();
  await expect(transactionsCard.getByText("- R$ 2,00")).toBeVisible();

  const { data: transactions } = await admin
    .from("finance_transactions")
    .select("amount, type, description")
    .eq("user_id", userId)
    .eq("description", "Bala");
  expect(transactions).toHaveLength(1);
  expect(Number(transactions![0]!.amount)).toBe(2);
  expect(transactions![0]!.type).toBe("expense");
});

test("cancelar uma transação some do saldo mas mantém o histórico", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Cancelamento");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Valor (R$)").fill("50.00");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Conta Cancelamento" });
  await page.getByLabel("Descrição").fill("Gasto a cancelar");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação registrada.")).toBeVisible();

  const transactionsCard = page.locator("#transacoes");
  const row = transactionsCard.locator("li", { hasText: "Gasto a cancelar" });
  await row.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Transação cancelada.")).toBeVisible();

  const { data: transaction } = await admin
    .from("finance_transactions")
    .select("canceled_at")
    .eq("user_id", userId)
    .eq("description", "Gasto a cancelar")
    .single();
  expect(transaction?.canceled_at).not.toBeNull();
});

test("criar orçamento e ultrapassar 80% mostra o percentual realizado", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Orçamento");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill("Alimentação E2E");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByText("Categoria criada.")).toBeVisible();

  await page.getByRole("button", { name: "Novo orçamento" }).click();
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: "Alimentação E2E" });
  await page.getByLabel("Valor planejado (R$)").fill("100.00");
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await expect(page.getByText("Orçamento criado.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Valor (R$)").fill("85.00");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Conta Orçamento" });
  await page
    .getByLabel("Categoria (opcional)")
    .selectOption({ label: "Alimentação E2E" });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação registrada.")).toBeVisible();

  const budgetsCard = page.locator("#orcamentos");
  await expect(budgetsCard.getByText(/85%/)).toBeVisible();

  const { data: alerts } = await admin
    .from("finance_budget_alerts")
    .select("threshold_percent")
    .eq("user_id", userId);
  expect(alerts?.map((a) => a.threshold_percent)).toEqual([80]);
});

test("orçamento com thresholds customizados só alerta nos percentuais configurados", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Threshold Custom");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill("Lazer E2E");
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByText("Categoria criada.")).toBeVisible();

  await page.getByRole("button", { name: "Novo orçamento" }).click();
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: "Lazer E2E" });
  await page.getByLabel("Valor planejado (R$)").fill("100.00");
  await page.getByLabel(/Alertar em %/).fill("50,75");
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await expect(page.getByText("Orçamento criado.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Valor (R$)").fill("60.00");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Conta Threshold Custom" });
  await page
    .getByLabel("Categoria (opcional)")
    .selectOption({ label: "Lazer E2E" });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação registrada.")).toBeVisible();

  const { data: budgets } = await admin
    .from("finance_budgets")
    .select("id, alert_thresholds")
    .eq("user_id", userId);
  const budget = budgets!.find(
    (b) => JSON.stringify(b.alert_thresholds) === JSON.stringify([50, 75]),
  );
  expect(budget).toBeTruthy();

  const { data: alerts } = await admin
    .from("finance_budget_alerts")
    .select("threshold_percent")
    .eq("budget_id", budget!.id);
  expect(alerts?.map((a) => a.threshold_percent)).toEqual([50]);
});

test("Quick Capture registra gasto e receita usando a mesma lógica do domínio financeiro", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Quick Capture");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page
    .locator('button[aria-label="Capturar rapidamente"]:visible')
    .first()
    .click();
  await page.getByRole("button", { name: "Gasto ou receita" }).click();
  await page.getByLabel("Valor (R$)").fill("15.00");
  await page
    .getByPlaceholder("Descrição (opcional)")
    .fill("Café quick capture");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Gasto registrado.")).toBeVisible();

  const { data: transactions } = await admin
    .from("finance_transactions")
    .select("amount, type, context")
    .eq("user_id", userId)
    .eq("description", "Café quick capture");
  expect(transactions).toHaveLength(1);
  expect(Number(transactions![0]!.amount)).toBe(15);
  expect(transactions![0]!.type).toBe("expense");
  expect(transactions![0]!.context).toBe("pessoal");

  // O toast de sucesso anterior pode sobrepor o FAB no mobile (mesma
  // posição, bottom-right) por tempo suficiente para atrapalhar o próximo
  // clique — recarrega a página em vez de acoplar o teste à duração exata
  // da animação do toast.
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page
    .locator('button[aria-label="Capturar rapidamente"]:visible')
    .first()
    .click();
  await page.getByRole("button", { name: "Gasto ou receita" }).click();
  await page.getByRole("button", { name: "Receita" }).click();
  await page.getByLabel("Valor (R$)").fill("500.00");
  await page
    .getByPlaceholder("Descrição (opcional)")
    .fill("Freela quick capture");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Receita registrada.")).toBeVisible();

  const { data: income } = await admin
    .from("finance_transactions")
    .select("type")
    .eq("user_id", userId)
    .eq("description", "Freela quick capture")
    .single();
  expect(income?.type).toBe("income");
});

test("contas próximas mostra ocorrências geradas por recorrência", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Recorrência E2E");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Nova recorrência" }).click();
  await page.getByLabel("Nome").fill("Academia E2E");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Conta Recorrência E2E" });
  await page.getByLabel("Valor (R$)").fill("90.00");
  const futureDay = new Date();
  futureDay.setDate(futureDay.getDate() + 5);
  await page.getByLabel("Dia do mês").fill(String(futureDay.getDate()));
  await page.getByRole("button", { name: "Criar recorrência" }).click();
  await expect(page.getByText("Recorrência criada.")).toBeVisible();

  const upcomingCard = page.locator("#contas-proximas");
  await expect(upcomingCard.getByText("Academia E2E")).toBeVisible();
});

test("filtro por período: navegar para o mês anterior some com a transação do mês atual", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Conta Período E2E");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Valor (R$)").fill("77.00");
  await page
    .getByLabel("Conta", { exact: true })
    .selectOption({ label: "Conta Período E2E" });
  await page.getByLabel("Descrição").fill("Gasto do mês atual");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação registrada.")).toBeVisible();

  const transactionsCard = page.locator("#transacoes");
  await expect(transactionsCard.getByText("Gasto do mês atual")).toBeVisible();

  await page.getByRole("button", { name: "Mês anterior" }).click();
  await expect(
    transactionsCard.getByText("Gasto do mês atual"),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Mês atual" }).click();
  await expect(transactionsCard.getByText("Gasto do mês atual")).toBeVisible();
});
