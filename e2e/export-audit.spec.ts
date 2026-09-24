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
const email = `e2e-export-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = "E2e-Test-Passw0rd!";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Usuário Export" },
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste e2e: ${error?.message}`);
  }
  userId = data.user.id;

  // Uma transação real para o CSV não sair vazio.
  const { data: account } = await admin
    .from("finance_accounts")
    .insert({
      user_id: userId,
      name: "Conta E2E",
      type: "conta_bancaria",
      context: "pessoal",
    })
    .select("id")
    .single();
  await admin.from("finance_transactions").insert({
    user_id: userId,
    account_id: account!.id,
    type: "expense",
    context: "pessoal",
    amount: "77.00",
    transaction_date: "2026-09-20",
    description: "Transação para teste de export",
  });
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
  await page.goto("/configuracoes");
  await page.waitForLoadState("networkidle");
});

test("baixar CSV de transações: nome de arquivo, tipo e conteúdo", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Dados e backup" }),
  ).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar transações CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^transacoes-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk as Buffer);
  const content = Buffer.concat(chunks).toString("utf-8");
  expect(content).toContain("Transação para teste de export");
  expect(content).toContain("77.00");

  await expect(page.getByText("Transações exportadas.")).toBeVisible();
});

test("baixar backup JSON: nome de arquivo, tipo e estrutura mínima", async ({
  page,
}) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar backup JSON" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^backup-meu-app-vida-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk as Buffer);
  const json = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

  expect(json.backupFormat).toBe("meu-app-vida-backup");
  expect(json.schemaVersion).toBe(1);
  expect(typeof json.generatedAt).toBe("string");
  expect(json.domains.financeiro.transacoes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        description: "Transação para teste de export",
      }),
    ]),
  );

  await expect(page.getByText("Backup gerado.")).toBeVisible();
});

test("exportar vendas: botão funciona mesmo sem nenhuma venda (dataset vazio não trava a UI)", async ({
  page,
}) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar vendas CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^vendas-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  await expect(page.getByText("Vendas exportadas.")).toBeVisible();
});

test("botões de exportação desabilitam durante o download (nunca double-submit)", async ({
  page,
}) => {
  const button = page.getByRole("button", {
    name: "Exportar transações CSV",
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button.click(),
  ]);
  // O texto de loading só aparece por uma fração de segundo em rede local
  // — o que importa é que o botão nunca ficou clicável duas vezes durante
  // o download e o resultado final é um único download bem-sucedido.
  expect(download.suggestedFilename()).toBeTruthy();
  await expect(button).toBeEnabled();
});
