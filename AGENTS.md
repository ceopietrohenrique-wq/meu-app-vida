# AGENTS.md — Contexto Permanente do Projeto

> Este arquivo é lido automaticamente pelo Codex em toda sessão.
> Mantenha-o ENXUTO. A spec completa está em `docs/SPEC-ORIGINAL.md` —
> só peça para ler quando precisar de um detalhe específico de um módulo
> específico. Não peça para ler o arquivo inteiro sem necessidade.

## O QUE É ESTE PROJETO

"Sistema Operacional da Minha Vida" — app pessoal (PWA) para rotina, hábitos,
metas, saúde, finanças pessoais e empresariais, vendas/CRM, estoque, ideias,
projetos e gamificação (XP). Produto real de longo prazo, não protótipo/MVP.

## STACK (fixa — não trocar sem justificativa forte)

- Next.js + React + TypeScript strict
- Tailwind CSS + shadcn/ui + Lucide Icons
- Supabase (Postgres + Auth + Storage + RLS)
- Zod (validação) + React Hook Form
- TanStack Query
- date-fns
- Recharts
- Vitest (unit) + Testing Library (component) + Playwright (E2E)
- PWA: manifest + service worker + Web Push

## ARQUITETURA — REGRAS INEGOCIÁVEIS

- Organização por **domínio** (tasks/, habits/, finance/, crm/, health/...),
  não por camada técnica genérica (components/hooks/utils globais).
- Cada domínio: components, queries, mutations, schemas, types, services, utils.
- UI chama serviço/use-case → serviço executa regra → banco persiste.
  Nunca lógica de negócio dentro de JSX.
- snake_case no banco, camelCase em TS, PascalCase em componentes.
- Dinheiro: sempre `numeric/decimal` no Postgres. NUNCA float JS para valores
  monetários persistidos.
- UUID como PK. RLS obrigatório em toda tabela com dado de usuário.
- Nunca `service_role` no client. Secrets só server-side.
- XP: idempotente via `xp_events` com `source_key` único
  (ex: `TASK_COMPLETED:{task_id}`, `HABIT:{habit_id}:{date}`). Nunca XP
  duplicado ao marcar/desmarcar/remarcar.
- Operações críticas (venda + estoque + financeiro + XP) são atômicas
  (RPC/transaction), nunca passos soltos.
- Nunca `@ts-ignore`, `as any` para silenciar erro, catch vazio, ou
  `test.skip` sem justificativa documentada.

## UX — REGRA CENTRAL

80% do uso diário = só Tela Hoje + Botão (+) + Notificações + Missões +
Registro rápido. Complexidade fica nos bastidores. Nunca menu com 30 opções.

## NAVEGAÇÃO

Mobile (bottom bar): Hoje · Planejamento · (+) · Progresso · Menu
Desktop (sidebar): Hoje · Planejamento · Saúde · Espiritual · Financeiro ·
Negócios · Progresso · Inbox · Configurações

## FASES (nesta ordem, sem pular, sem paralelizar)

0. Fundação (projeto, design system, Supabase, Auth, RLS, migrations, CI, PWA básica)
1. Núcleo de execução (Hoje, Tarefas, Hábitos, Missões, XP, Quick Capture, Inbox)
2. Saúde (peso, IMC, água, dieta, treino)
3. Espiritual (devocional, bíblia, orações)
4. Financeiro (contas, transações, orçamentos, pessoal x empresarial)
5. Negócios (CRM, catálogo, kits, vendas, estoque, indicadores)
6. Progresso (dashboard consolidado, revisão semanal, recompensas)
7. Notificações Push
8. Refinamento PWA (offline, performance, acessibilidade, Lighthouse)

**Gate de cada fase:** lint + typecheck + testes + build passando, e o fluxo
manual da fase funcionando em mobile e desktop, ANTES de avançar para a próxima.
Se algo quebrar, corrigir antes de empilhar funcionalidade nova.

## PROCESSO DENTRO DE CADA FASE

1. Atualizar docs → 2. Migration → 3. Types/schemas → 4. Regra de negócio →
2. Teste da regra → 6. Camada de dados → 7. Interface → 8. Teste de
   integração → 9. E2E relevante → 10. lint → 11. typecheck → 12. testes →
3. build → 14. corrigir tudo. Só então declarar fase concluída.

## AUTONOMIA

Decisão trivial → use bom senso, siga em frente.
Decisão de médio impacto → escolha o mais simples, documente em docs/architecture.md.
Só pare para perguntar quando houver: credencial que eu preciso fornecer,
conta externa a criar, custo relevante, decisão irreversível, ou mudança
significativa de escopo.

## RELATÓRIO AO FIM DE CADA FASE

Sempre reportar: o que foi implementado, migrations criadas, testes
adicionados, resultado de lint/typecheck/tests/build, o que falta, riscos
conhecidos. Nunca só "Pronto."

## PRIORIDADE (em caso de conflito)

Integridade dos dados > Segurança > Funcionamento correto > Experiência do
usuário > Simplicidade > Testabilidade > Manutenção > Performance > Escalabilidade

> Novas funcionalidades.

## REFERÊNCIA

Spec completa e detalhada (regras de negócio, campos exatos de cada entidade,
fórmulas financeiras, textos de notificação, etc.): `docs/SPEC-ORIGINAL.md`.
Leia a seção relevante quando for implementar aquele módulo específico —
não leia o arquivo inteiro à toa.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
