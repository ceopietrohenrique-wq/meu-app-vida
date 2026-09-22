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
const email = `e2e-fase5-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Fase 5" },
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
  await page.goto("/negocios");
  await page.waitForLoadState("networkidle");
});

test("criar lead e registrar follow-up (próxima ação + interação)", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Novo lead/cliente" }).click();
  await page.getByLabel("Nome").fill("Cliente E2E");
  await page.getByRole("button", { name: "Criar lead/cliente" }).click();
  await expect(page.getByText("Cliente/lead criado.")).toBeVisible();

  const customersCard = page.locator("#clientes");
  await expect(customersCard.getByText("Cliente E2E")).toBeVisible();

  const customerRow = customersCard.locator("li", { hasText: "Cliente E2E" });
  await customerRow.getByRole("button", { name: "Detalhes" }).click();

  await page.getByPlaceholder("O que fazer").fill("Ligar amanhã");
  await page.getByRole("button", { name: "Salvar próxima ação" }).click();
  await expect(page.getByText("Próxima ação salva.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar interação" }).click();
  await expect(page.getByText("Interação registrada.")).toBeVisible();

  const { data: customer } = await admin
    .from("customers")
    .select("next_action")
    .eq("user_id", userId)
    .eq("name", "Cliente E2E")
    .single();
  expect(customer?.next_action).toBe("Ligar amanhã");

  const { data: interactions } = await admin
    .from("customer_interactions")
    .select("id")
    .eq("user_id", userId);
  expect(interactions).toHaveLength(1);
});

test("mudar estágio do pipeline reflete no banco", async ({ page }) => {
  await page.getByRole("button", { name: "Novo lead/cliente" }).click();
  await page.getByLabel("Nome").fill("Lead Pipeline E2E");
  await page.getByRole("button", { name: "Criar lead/cliente" }).click();
  await expect(page.getByText("Cliente/lead criado.")).toBeVisible();

  await page
    .getByLabel("Estágio de Lead Pipeline E2E")
    .selectOption({ label: "Interessado" });

  await expect(async () => {
    const { data: customer } = await admin
      .from("customers")
      .select("stage")
      .eq("user_id", userId)
      .eq("name", "Lead Pipeline E2E")
      .single();
    expect(customer?.stage).toBe("interessado");
  }).toPass();
});

test("criar item de catálogo, criar venda selecionando itens e confirmar baixa estoque", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Novo item" }).click();
  await page.getByLabel("Nome").fill("Plaquinha E2E");
  await page.getByLabel("Preço padrão (R$)").fill("50.00");
  await page.getByLabel("Custo padrão (R$)").fill("20.00");
  await page.getByLabel("Controlar estoque deste item").check();
  await page.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item de catálogo criado.")).toBeVisible();

  const catalogCard = page.locator("#catalogo");
  await expect(catalogCard.getByText("Plaquinha E2E")).toBeVisible();

  // Entrada de estoque inicial.
  await page.getByRole("button", { name: "Movimentar estoque" }).click();
  await page.getByLabel("Item").selectOption({ label: "Plaquinha E2E" });
  await page.getByLabel("Quantidade").fill("10");
  await page.getByRole("button", { name: "Registrar movimentação" }).click();
  await expect(page.getByText("Movimentação registrada.")).toBeVisible();

  const inventoryCard = page.locator("#estoque");
  await expect(inventoryCard.getByText("Plaquinha E2E")).toBeVisible();
  await expect(inventoryCard.getByText("10")).toBeVisible();

  // Cria a venda selecionando o item e já confirmando (baixa estoque).
  await page.getByRole("button", { name: "Nova venda" }).click();
  await page
    .getByLabel("Item 1", { exact: true })
    .selectOption({ label: "Plaquinha E2E" });
  await page.getByLabel("Quantidade do item 1").fill("3");
  await page.getByLabel("Status inicial").selectOption({ label: "Confirmada" });
  await page.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page.getByText("Venda registrada.")).toBeVisible();

  const salesCard = page.locator("#vendas");
  await expect(salesCard.getByText("Confirmada")).toBeVisible();

  const { data: catalogItem } = await admin
    .from("catalog_items")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Plaquinha E2E")
    .single();
  const { data: movements } = await admin
    .from("inventory_movements")
    .select("quantity_delta, type")
    .eq("catalog_item_id", catalogItem!.id)
    .eq("type", "venda");
  expect(movements).toHaveLength(1);
  expect(movements![0]!.quantity_delta).toBe(-3);

  await expect(inventoryCard.getByText("7")).toBeVisible();
});

test("finalizar venda (marcar como paga) lança receita no Financeiro", async ({
  page,
}) => {
  // A conta empresarial vive no domínio Financeiro (Fase 4) — Negócios
  // reaproveita finance_accounts, nunca duplica o conceito de "conta".
  await page.goto("/financeiro");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByLabel("Nome").fill("Caixa E2E Negócios");
  await page
    .getByLabel("Contexto", { exact: true })
    .selectOption({ label: "Empresarial" });
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta criada.")).toBeVisible();

  await page.goto("/negocios");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Novo item" }).click();
  await page.getByLabel("Nome").fill("Serviço E2E");
  await page.getByLabel("Preço padrão (R$)").fill("300.00");
  await page.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item de catálogo criado.")).toBeVisible();

  await page.getByRole("button", { name: "Nova venda" }).click();
  await page
    .getByLabel("Item 1", { exact: true })
    .selectOption({ label: "Serviço E2E" });
  await page
    .getByLabel(
      "Conta de destino (opcional — necessária para lançar receita ao marcar como paga)",
    )
    .selectOption({ label: "Caixa E2E Negócios" });
  await page.getByLabel("Status inicial").selectOption({ label: "Confirmada" });
  await page.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page.getByText("Venda registrada.")).toBeVisible();

  const salesCard = page.locator("#vendas");
  // Escopado pelo valor exato da venda (R$ 300,00) em vez de `.first()`:
  // outros testes deste arquivo também deixam vendas 'Confirmada' na
  // mesma lista, e `.first()` poderia acertar a venda errada (sem conta
  // de destino), fazendo este teste marcar como paga uma venda que nunca
  // lançaria receita.
  const saleRow = salesCard.locator("li", { hasText: "R$ 300,00" });
  await saleRow.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(page.getByText("Venda marcada como paga.")).toBeVisible();

  const { data: sale } = await admin
    .from("sales")
    .select("revenue_transaction_id")
    .eq("user_id", userId)
    .eq("status", "paid")
    .single();
  expect(sale?.revenue_transaction_id).not.toBeNull();

  const { data: financeTx } = await admin
    .from("finance_transactions")
    .select("amount")
    .eq("id", sale!.revenue_transaction_id!)
    .single();
  expect(Number(financeTx?.amount)).toBe(300);
});
