# Sistema Operacional da Minha Vida

App pessoal (PWA) para rotina, hábitos, metas, saúde, finanças e negócios.
Contexto completo do produto em [`CLAUDE.md`](./CLAUDE.md) e
[`docs/SPEC-ORIGINAL.md`](./docs/SPEC-ORIGINAL.md). Arquitetura, modelo de
dados, regras de negócio e roadmap em [`docs/`](./docs).

> Estado atual: Fase 0 (Fundação) — setup técnico. Sem autenticação,
> migrations ou funcionalidades de negócio ainda.

## Stack

Next.js (App Router) + React + TypeScript strict, Tailwind CSS + shadcn/ui,
Supabase (Postgres + Auth + Storage + RLS), Zod + React Hook Form, TanStack
Query, Vitest + Testing Library + Playwright.

## Pré-requisitos

- Node.js 22+
- Uma conta/projeto no [Supabase](https://supabase.com)

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
  nem expor no client; usada apenas em código server-side
  (`src/shared/lib/supabase/admin.ts`).

## Desenvolvimento

```bash
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                            | Descrição                      |
| --------------------------------- | ------------------------------ |
| `npm run dev`                     | servidor de desenvolvimento    |
| `npm run build`                   | build de produção              |
| `npm run start`                   | serve o build de produção      |
| `npm run lint`                    | ESLint                         |
| `npm run typecheck`               | `tsc --noEmit`                 |
| `npm run format` / `format:check` | Prettier                       |
| `npm test`                        | testes unitários (Vitest)      |
| `npm run test:watch`              | Vitest em modo watch           |
| `npm run test:coverage`           | Vitest com cobertura           |
| `npm run test:e2e`                | testes end-to-end (Playwright) |

## Estrutura do projeto

Organização por domínio de negócio (não por camada técnica). Ver
[`docs/architecture.md`](./docs/architecture.md) para detalhes.

```
src/
  app/            # rotas Next.js (App Router)
  domains/        # um diretório por domínio (tasks, habits, xp, finance, ...)
  shared/         # design system (shadcn/ui), lib (supabase, utils), tipos genéricos
supabase/
  migrations/     # migrations versionadas (ainda vazio na Fase 0)
  seed/           # seed de desenvolvimento (ainda vazio na Fase 0)
e2e/              # testes Playwright
```

## Supabase

Migrations e RLS ainda não foram criadas (próximo passo da Fase 0). Quando
existirem, o fluxo local será documentado aqui (CLI do Supabase, `supabase
db push`, seed).

## Testes

- Unitários/componentes: Vitest + Testing Library (`src/**/*.test.ts(x)`).
- End-to-end: Playwright (`e2e/`), roda contra o build de produção
  (`npm run build && npm run start`), viewports mobile e desktop.

## CI

`.github/workflows/ci.yml` roda lint, format check, typecheck, testes
unitários com cobertura, build e testes e2e a cada push/PR.

## Deploy

A definir quando a Fase 0 avançar para produção (checklist completo em
`docs/roadmap.md`).
