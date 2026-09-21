import { expect, test } from "@playwright/test";

test("visitante não autenticado é redirecionado para /login ao acessar a home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("visitante não autenticado é redirecionado para /login ao acessar /configuracoes", async ({
  page,
}) => {
  await page.goto("/configuracoes");
  await expect(page).toHaveURL(/\/login$/);
});

test("navegação entre login, cadastro e recuperação de senha", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  await page.getByRole("link", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(
    page.getByRole("heading", { name: "Criar conta" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/\/recuperar-senha$/);
  await expect(
    page.getByRole("heading", { name: "Recuperar senha" }),
  ).toBeVisible();
});

test("formulário de login valida campos obrigatórios", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Informe seu e-mail.")).toBeVisible();
  await expect(page.getByText("Informe sua senha.")).toBeVisible();
});
