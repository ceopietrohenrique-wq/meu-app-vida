// Fase 8 > Lighthouse. Roda contra o build de PRODUÇÃO (`npm run build &&
// npm run start` já precisa estar de pé em localhost:3000 — mesmo servidor
// usado pelo webServer do Playwright), nunca contra `next dev`.
//
// Uso:
//   node scripts/lighthouse.mjs /login
//   node scripts/lighthouse.mjs / --auth      (autenticado — cria um usuário
//                                              de teste, loga via Playwright,
//                                              reaproveita o cookie de sessão)
//
// Git Bash/MSYS no Windows reescreve automaticamente um argumento que
// começa com "/" como se fosse um path do sistema (`/login` vira algo como
// `C:/Program Files/Git/login`) — prefixe com `MSYS_NO_PATHCONV=1` nesse
// terminal: `MSYS_NO_PATHCONV=1 node scripts/lighthouse.mjs /login`. Não
// acontece no PowerShell/cmd.
//
// Por padrão audita uma página pública sem login. Passe --auth para logar
// primeiro (necessário para qualquer rota dentro do app, já que o
// middleware/layout redireciona usuário sem sessão para /login).
//
// Ambiente: usa o Chromium já baixado pelo Playwright
// (ms-playwright/chromium-*/chrome-win64/chrome.exe no Windows) em vez de
// depender de um Chrome instalado separado.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as chromeLauncher from "chrome-launcher";
import { config } from "dotenv";
import lighthouse from "lighthouse";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const authFlag = args.includes("--auth");
const targetPath = args.find((a) => !a.startsWith("--")) ?? "/login";
const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";

function findChromePath() {
  const playwrightCache = path.join(
    process.env.LOCALAPPDATA ?? "",
    "ms-playwright",
  );
  if (!fs.existsSync(playwrightCache)) return undefined;
  const dir = fs
    .readdirSync(playwrightCache)
    .find((d) => d.startsWith("chromium-"));
  if (!dir) return undefined;
  const candidate = path.join(
    playwrightCache,
    dir,
    "chrome-win64",
    "chrome.exe",
  );
  return fs.existsSync(candidate) ? candidate : undefined;
}

let cookieHeader;
let cleanupUser;

if (authFlag) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const email = `lighthouse-${Date.now()}@example.com`;
  const password = "Lighthouse-Test-1!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  cleanupUser = () => admin.auth.admin.deleteUser(data.user.id);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${baseUrl}/`);
  const cookies = await context.cookies();
  cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  await browser.close();
}

const chrome = await chromeLauncher.launch({
  chromePath: findChromePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

try {
  const result = await lighthouse(`${baseUrl}${targetPath}`, {
    port: chrome.port,
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices"],
    logLevel: "error",
    ...(cookieHeader ? { extraHeaders: { Cookie: cookieHeader } } : {}),
  });

  const outFile = `lighthouse-${targetPath === "/" ? "home" : targetPath.replace(/\//g, "")}.json`;
  fs.writeFileSync(outFile, result.report);
  // console.error (não .log) porque é a única saída de texto que o lint
  // deste projeto permite em scripts — script CLI, resultado vai pro
  // terminal de qualquer forma.
  console.error(`Relatório salvo em ${outFile}`);
  console.error("URL final auditada:", result.lhr.finalDisplayedUrl);
  for (const [key, category] of Object.entries(result.lhr.categories)) {
    console.error(`${key}: ${Math.round(category.score * 100)}`);
  }
} finally {
  try {
    await chrome.kill();
  } catch {
    // Bug conhecido de ambiente (Windows): chrome-launcher falha ao
    // remover o diretório temp do profile no cleanup (EPERM). O relatório
    // já foi escrito em disco antes disso — não afeta o resultado.
  }
  if (cleanupUser) await cleanupUser();
}
