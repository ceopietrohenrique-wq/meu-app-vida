# Sistema Operacional da Minha Vida

App pessoal (PWA) para rotina, hábitos, metas, saúde, finanças e negócios.
Contexto completo do produto em [`CLAUDE.md`](./CLAUDE.md) e
[`docs/SPEC-ORIGINAL.md`](./docs/SPEC-ORIGINAL.md). Arquitetura, modelo de
dados, regras de negócio e roadmap em [`docs/`](./docs).

> Estado atual: Fase 8 (Refinamento PWA) — última fase do roadmap. Todas as
> 8 fases (Fundação, Núcleo de execução, Saúde, Espiritual, Financeiro,
> Negócios, Progresso, Notificações Push, Refinamento PWA) implementadas.
> A lacuna de exportação/backup (identificada na auditoria final) também
> foi resolvida — ver [`## Exportação e backup`](#exportação-e-backup).

## Stack

Next.js (App Router) + React + TypeScript strict, Tailwind CSS + shadcn/ui,
Supabase (Postgres + Auth + Storage + RLS), Zod + React Hook Form, TanStack
Query, date-fns, Recharts, Vitest + Testing Library + Playwright, Web Push
(VAPID) + Supabase Edge Functions (Deno) + GitHub Actions (scheduler).

## Pré-requisitos

- Node.js 22+
- Uma conta/projeto no [Supabase](https://supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`
  ou via `npx supabase`) — para migrations e Edge Functions
- Opcional, só se for mexer em Push: uma conta GitHub com Actions habilitado
  no fork/repositório (o scheduler de produção roda lá)

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do seu projeto Supabase (Project
Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto, sem sufixo de path
  (ex.: `https://xxxx.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave pública anon.
- `SUPABASE_SERVICE_ROLE_KEY` — chave de service role. **Nunca** commitar
  nem expor no client; usada apenas em testes de integração/RLS (rodam
  localmente) e nas Edge Functions (só como secret do Supabase, nunca neste
  arquivo em produção).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — só necessário se for testar Push
  localmente. Ver [`## Push notifications`](#push-notifications) abaixo.

## Supabase

### Rodando as migrations

```bash
npx supabase link --project-ref <seu-project-ref>
npm run db:migrate
```

Isso aplica todas as migrations em `supabase/migrations/` (ordenadas por
timestamp no nome do arquivo) contra o banco do projeto linkado. Todas as
tabelas com dado de usuário têm RLS habilitado — nunca existe uma migration
que crie tabela sem policy.

### Testes de integração/RLS contra o banco real

```bash
npm run test:rls
```

Cria usuários de teste reais via `SUPABASE_SERVICE_ROLE_KEY`, exercita RLS,
triggers e RPCs, e limpa os usuários ao final. Precisa das migrations já
aplicadas no projeto apontado por `.env.local`.

## Desenvolvimento

```bash
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                            | Descrição                                              |
| --------------------------------- | ------------------------------------------------------ |
| `npm run dev`                     | servidor de desenvolvimento                            |
| `npm run build`                   | build de produção                                      |
| `npm run start`                   | serve o build de produção                              |
| `npm run lint`                    | ESLint                                                 |
| `npm run typecheck`               | `tsc --noEmit`                                         |
| `npm run format` / `format:check` | Prettier                                               |
| `npm test`                        | testes unitários (Vitest)                              |
| `npm run test:watch`              | Vitest em modo watch                                   |
| `npm run test:coverage`           | Vitest com cobertura                                   |
| `npm run test:rls`                | testes de integração/RLS contra o Supabase real        |
| `npm run test:e2e`                | testes end-to-end (Playwright, mobile + desktop)       |
| `npm run db:migrate`              | aplica migrations pendentes (`supabase db push`)       |
| `npm run lighthouse`              | Lighthouse contra `/login` (build de produção)         |
| `npm run lighthouse:auth`         | Lighthouse contra `/` autenticado (cria user de teste) |

## Estrutura do projeto

Organização por domínio de negócio (não por camada técnica). Ver
[`docs/architecture.md`](./docs/architecture.md) para detalhes.

```
src/
  app/            # rotas Next.js (App Router)
  domains/        # um diretório por domínio (tasks, habits, xp, finance, notifications, ...)
  shared/         # design system (shadcn/ui), lib (supabase, utils), tipos genéricos
supabase/
  migrations/     # migrations versionadas, aplicadas em ordem por timestamp
  functions/      # Edge Functions (Deno) — generate-notifications, send-push
  tests/          # testes de integração/RLS (Vitest, contra o banco real)
  seed/           # seed de desenvolvimento
e2e/              # testes Playwright (specs por fase, ex.: fase7.spec.ts)
scripts/          # scripts utilitários (ex.: lighthouse.mjs)
.github/workflows/
  ci.yml                    # lint/typecheck/test/build/e2e a cada push/PR
  notifications-cron.yml    # scheduler de produção do Push (Fase 7)
```

## Testes

- Unitários/componentes: Vitest + Testing Library (`src/**/*.test.ts(x)`) —
  regra de negócio pura (cálculos, streak, IMC, margem, ROI, ticket médio) e
  services de domínio.
- Integração/RLS: Vitest contra o Supabase real (`supabase/tests/`) — prova
  que usuário A nunca lê/edita/exclui dado de B, que triggers de dedup/
  idempotência funcionam, e testes de concorrência real (ex.: dois resgates
  de recompensa simultâneos nunca gastam o mesmo XP duas vezes).
- End-to-end: Playwright (`e2e/`), roda contra o build de produção
  (`npm run build && npm run start`), viewports mobile (`Pixel 7`) e desktop
  (`Desktop Chrome`) — inclui varredura de acessibilidade automatizada
  (axe-core, `e2e/fase8-a11y.spec.ts`) e testes de PWA/offline/service worker
  (`e2e/fase8-pwa.spec.ts`).

## PWA

- **Manifest**: `src/app/manifest.ts` (Next.js `MetadataRoute.Manifest`),
  servido em `/manifest.webmanifest`. Ícones gerados dinamicamente em
  `src/app/icons/{icon-192,icon-512}/route.tsx` (via `next/og`), incluindo
  uma entrada `purpose: "maskable"`.
- **Instalação**: navegadores Chromium (Android/desktop) mostram o prompt
  nativo; `src/shared/components/pwa/install-app-button.tsx` só aparece
  quando o browser dispara `beforeinstallprompt` de verdade — nunca um botão
  falso. **iOS/Safari nunca dispara esse evento** (limitação da Apple) — lá
  a instalação é manual: Safari → botão de compartilhar → "Adicionar à Tela
  de Início".
- **Service worker**: `public/sw.js`. App shell + offline fallback
  (`public/offline.html`) desde a Fase 0, Web Push (`push`/`notificationclick`)
  desde a Fase 7. Estratégia de cache documentada no topo do próprio
  arquivo e em `docs/business-rules.md` > Fase 8. Versionado via
  `CACHE_NAME` — trocar a versão invalida o que os usuários já instalaram
  (o `activate` limpa caches antigos automaticamente).
- **Safe areas (iPhone notch/Dynamic Island)**: `viewport-fit: cover` +
  `env(safe-area-inset-*)` em `bottom-nav.tsx` e no header do `app-shell.tsx`.

## Push notifications

Arquitetura completa em `docs/business-rules.md` > Fase 7 e
`docs/architecture.md`. Resumo do fluxo de produção:

1. **Geração**: `generate-notifications` (Edge Function) chama
   `generate_scheduled_notifications()` no Postgres — verifica estado atual
   de cada usuário (tarefa pendente, água não batida, etc.), respeita
   preferências e deduplica via `notification_key`.
2. **Envio**: `send-push` (Edge Function) seleciona o que está pronto
   (revalidando estado + quiet hours), envia via Web Push (VAPID,
   `npm:web-push` no Deno) e registra o resultado.
3. **Scheduler**: `.github/workflows/notifications-cron.yml` chama as duas,
   nessa ordem, a cada 15 minutos (`schedule: cron: "*/15 * * * *"`), mais
   `workflow_dispatch` para rodar manualmente. Autenticação via
   `Authorization: Bearer <CRON_SECRET>` — as Edge Functions são deployadas
   com `--no-verify-jwt` (o gate de autenticação é só o `CRON_SECRET`, não o
   JWT da plataforma Supabase, que aceitaria até a `anon key` pública).

### Deploy/configuração das Edge Functions

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>

# Gerar um CRON_SECRET forte (qualquer string aleatória):
#   openssl rand -hex 32
npx supabase secrets set \
  VAPID_PUBLIC_KEY=<chave pública> \
  VAPID_PRIVATE_KEY=<chave privada> \
  VAPID_SUBJECT=mailto:seu-email@dominio.com \
  CRON_SECRET=<o mesmo valor que você vai colocar no GitHub Actions Secrets>

npx supabase functions deploy generate-notifications --no-verify-jwt
npx supabase functions deploy send-push --no-verify-jwt
```

No GitHub: **Settings → Secrets and variables → Actions → New repository
secret**, nome `CRON_SECRET`, mesmo valor configurado no Supabase acima.
Depois disso o workflow roda sozinho a cada 15 minutos; para testar na hora,
aba **Actions → Notifications Cron → Run workflow**.

### Diagnóstico de falha do Push

- **Workflow do GitHub falhou**: aba Actions → abrir a execução → o log de
  cada step mostra o HTTP status e o corpo da resposta da Edge Function.
  Status 401 quase sempre é `CRON_SECRET` ausente/diferente entre GitHub e
  Supabase.
- **Edge Function não aparece nos logs do Supabase**: confirme que foi
  deployada com `--no-verify-jwt` (`npx supabase functions list` mostra
  `verify_jwt`) — sem isso, o gateway do Supabase intercepta a chamada
  antes do código rodar e aceita até a `anon key`, o que quebra a garantia
  de que só o `CRON_SECRET` autoriza.
- **Push não chega no navegador**: confira em `/configuracoes` se
  "Notificações push" está ativado E se `push_subscriptions.is_active` é
  `true` para o usuário (uma subscription pode ter sido desativada
  automaticamente após o push service confirmar endpoint expirado — HTTP
  404/410, nunca em erro transitório).

## Acessibilidade

Varredura automatizada com axe-core (`e2e/fase8-a11y.spec.ts`) nas páginas
principais e fluxos críticos (Quick Capture, Busca Global) — falha em
qualquer violação de impacto `critical`/`serious`. Rode `npm run test:e2e`
para incluir essa varredura.

## Exportação e backup

Em **Configurações → Dados e backup**, três ações:

- **Exportar transações CSV** — todas as transações financeiras do usuário
  (`transacoes-AAAA-MM-DD.csv`).
- **Exportar vendas CSV** — todas as vendas (`vendas-AAAA-MM-DD.csv`).
  Lucro/margem reaproveitam a mesma fórmula da RPC
  `get_business_dashboard_summary` (nunca uma segunda definição).
- **Baixar backup JSON** — todos os dados do usuário, agrupados por domínio,
  com versão de schema e timestamp de geração
  (`backup-meu-app-vida-AAAA-MM-DD.json`).

Cada exportação roda inteiramente no client autenticado (o mesmo Supabase
client do resto do app) — nunca um `userId` vindo do browser, nunca
`service_role`, sempre protegido por RLS. Consultas grandes são paginadas
em lotes de 1000 linhas (`fetchAllRows`), então um histórico grande nunca
é truncado silenciosamente. Nada é enviado para fora da aplicação; o
arquivo é gerado e baixado direto no navegador.

**O que entra no backup**: perfil, tarefas/hábitos/planejamento, saúde
(peso/água/dieta/treino), espiritual (devocional/leitura/oração),
financeiro (contas/transações/orçamentos), negócios (clientes/vendas/
estoque), progresso (XP/recompensas/conquistas/revisões), preferências de
notificação.

**O que NUNCA entra**: `push_subscriptions` (chaves de dispositivo),
`scheduled_notifications` (fila técnica interna), qualquer secret/token/
credencial.

**Sem importação nesta versão** — o backup é só para preservação/
recuperação manual futura. `sale_status_changes` (histórico de status de
venda) está incluído no backup mas exige cuidado especial numa eventual
restauração (precisa ser aplicado na ordem certa, depois das vendas).

## Performance

- `npm run lighthouse` / `npm run lighthouse:auth` rodam Lighthouse (via
  `scripts/lighthouse.mjs`, usando o Chromium já baixado pelo Playwright)
  contra o build de **produção** — nunca `next dev`. Suba o servidor de
  produção antes (`npm run build && npm run start`).
- Componentes pesados (Recharts, a busca global via `cmdk`) são carregados
  sob demanda com `next/dynamic` (`ssr: false`), nunca no bundle inicial.

> No Git Bash/Windows (MSYS), um argumento que começa com `/` é reescrito
> automaticamente como path do sistema — se for chamar o script diretamente
> com um path (`node scripts/lighthouse.mjs /login`), prefixe com
> `MSYS_NO_PATHCONV=1`. Não acontece no PowerShell/cmd nem ao usar os
> scripts do `package.json`, que já fixam o path internamente.

## CI

`.github/workflows/ci.yml` roda lint, format check, typecheck, testes
unitários com cobertura, build e testes e2e a cada push/PR.
`.github/workflows/notifications-cron.yml` é um workflow separado — o
scheduler de produção do Push (Fase 7), não faz parte do pipeline de CI.

## Deploy

Recomendado: [Vercel](https://vercel.com) (integração nativa com Next.js).
Configure as env vars de `.env.example` no dashboard do projeto — nunca
commitar `.env.local`. As Edge Functions do Supabase são deployadas
separadamente (ver [`## Push notifications`](#push-notifications)) — não
fazem parte do deploy do Next.js.
