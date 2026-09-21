# Arquitetura — Sistema Operacional da Minha Vida

> Documento vivo. Atualizar sempre que uma decisão arquitetural relevante for
> tomada. Detalhes de regra de negócio ficam em `business-rules.md`, modelo
> de dados em `database.md`, fases em `roadmap.md`.

## 1. Visão geral

Aplicação Next.js (App Router) + React + TypeScript strict, com Supabase como
backend (Postgres + Auth + Storage + RLS). PWA instalável, mobile-first,
funcionando igualmente bem em desktop.

Fluxo central do produto:

```
PLANEJAR → LEMBRAR → EXECUTAR → REGISTRAR → GANHAR XP →
VISUALIZAR PROGRESSO → RECEBER FEEDBACK → REVISAR → MELHORAR
```

80% do uso diário deve ser resolvido por: Tela Hoje, Botão (+) / Quick
Capture, Notificações, Missões e Registro rápido. Toda complexidade adicional
fica atrás de telas secundárias ("Mais opções", áreas de detalhe).

## 2. Organização por domínio

O código é organizado por **domínio de negócio**, nunca por camada técnica
genérica. Não existe `components/`, `hooks/` ou `utils/` globais como
primeira divisão do projeto — essas pastas só existem *dentro* de cada
domínio, ou em `shared/` para o que é genuinamente compartilhado.

```
src/
  app/                      # rotas Next.js (App Router)
  domains/
    tasks/
      components/
      queries/              # leitura (TanStack Query hooks)
      mutations/            # escrita (TanStack Query hooks)
      schemas/              # Zod
      types/
      services/             # regra de negócio / use-cases
      utils/
    habits/
    xp/
    goals/
    planning/
    health/
    workouts/
    nutrition/
    spiritual/
    finance/
    business/
    crm/
    sales/
    catalog/
    inventory/
    ideas/
    projects/
    notes/
    inbox/
    notifications/
    reviews/
    analytics/
    search/
    settings/
    auth/
  shared/
    components/ui/          # shadcn/ui + design system
    lib/                    # supabase client, date helpers, money helpers...
    types/                  # tipos verdadeiramente cross-domain
supabase/
  migrations/
  seed/
docs/
```

Regra: um domínio não importa detalhes internos de outro domínio (schemas,
services). Se precisar de dado de outro domínio, consome via seu `types`/
`queries` públicos, ou o dado é combinado na camada de página/dashboard.

## 3. Fluxo de dados (regra inegociável)

```
UI (componente/página)
  → chama service/use-case do domínio
    → service executa a regra de negócio (validação, orquestração)
      → chama Supabase (client gerado, RPC quando precisa atomicidade)
        → Postgres persiste (constraints, RLS, triggers/functions quando necessário)
```

- Nunca lógica de negócio dentro de JSX.
- Nunca chamada Supabase solta dentro de um componente — sempre via
  `services/` (ou `queries`/`mutations` que delegam a `services`).
- Leitura/cache/sincronização entre telas via TanStack Query (invalidar
  queries após mutations; optimistic UI só quando reversível com segurança).
- Operações que tocam mais de uma tabela de forma crítica (ex.: concluir
  venda + baixar estoque + lançar financeiro + XP) são sempre uma **RPC
  Postgres transacional**, nunca uma sequência de chamadas soltas do cliente.

## 4. Autenticação e autorização

- Supabase Auth, email/senha na v1. Arquitetura não deve impedir social login
  futuro (mantemos a tabela `profiles` desacoplada do provedor).
- Toda tabela com dado de usuário tem RLS habilitado e políticas explícitas
  para SELECT/INSERT/UPDATE/DELETE restritas a `auth.uid() = user_id` (ou
  relação equivalente de ownership).
- Nunca `service_role` no client. Chaves de serviço só em rotas server-side
  (route handlers / server actions) que nunca são expostas ao browser.
- Rotas privadas exigem sessão validada no server (middleware/layout),
  nunca apenas ocultando itens de menu no client.

## 5. Server vs client components

- Server Components por padrão. `"use client"` só onde há interatividade,
  estado local, ou hooks de browser.
- Nenhum secret (service role key, chaves de push, etc.) entra em client
  component ou é serializado para o browser.

## 6. Dinheiro e precisão numérica

- Todo valor monetário persistido usa `numeric/decimal` no Postgres — nunca
  `float`/`double precision`.
- No TypeScript, valores monetários trafegam como string/number inteiro em
  centavos (a decidir na implementação do domínio `finance`) e toda
  formatação/arredondamento passa por helpers centralizados em
  `shared/lib/money`. Nunca formatação manual espalhada pelo código.

## 7. XP — idempotência (visão arquitetural)

XP nunca é um campo mutável somado diretamente; é sempre resultado de um
evento imutável em `xp_events`, com `source_key` único por ocorrência
(`UNIQUE` constraint no banco — a garantia é do banco, não do frontend).
Detalhes de cálculo e regras ficam em `business-rules.md`.

## 8. Idempotência e concorrência (geral)

- Ações que podem ser disparadas mais de uma vez (double-submit, dois
  dispositivos) usam chave de idempotência (`source_key`, `notification_key`
  ou equivalente) com constraint `UNIQUE` no banco.
- Botões de ação crítica ficam em estado `loading`/desabilitados durante o
  submit, mas a proteção real é sempre no banco.
- Dados críticos concorrentes entre dispositivos (estoque, transações,
  vendas) usam `updated_at` e, quando necessário, controle otimista de
  concorrência.

## 9. Auditoria

`audit_logs` registra alterações relevantes (transações financeiras, vendas,
estoque, configurações importantes) com `user_id`, `entity_type`,
`entity_id`, `action`, `before`/`after` opcionais e `timestamp`. Não é usado
para eventos triviais de UI.

## 10. Notificações (visão arquitetural)

Duas camadas desde a Fase 1: `IN_APP` (tabela `notifications`) e, a partir da
Fase 7, `PUSH` (Web Push + service worker). Arquitetura já prevê múltiplos
canais via `notification_preferences` por categoria, mas só implementamos o
que a fase corrente exige. Deduplicação via `notification_key` único.

## 11. PWA

Manifest + service worker desde a Fase 0 (nível básico: instalabilidade,
ícones, shell). Push notifications reais só na Fase 7. Toda funcionalidade
tem fallback quando o browser/dispositivo não suporta um recurso
(feature/capability detection, nunca "quebrar" a aplicação).

## 12. Testes

- Vitest para regra de negócio pura (cálculos de XP, streak, IMC, margem,
  ROI, ticket médio, etc.) e para services de domínio.
- Testing Library para componentes com lógica de interação relevante.
- Playwright para fluxos ponta a ponta (mobile e desktop viewport).
- Teste de RLS obrigatório: usuário A nunca lê/edita/exclui dado do usuário B.
- CI roda lint + typecheck + testes + build. Nenhuma fase avança com algum
  desses quebrado.

## 13. Decisões já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Organização de código | por domínio | exigência explícita do projeto, evita acoplamento em `utils`/`components` genéricos |
| Operações críticas multi-tabela | RPC Postgres transacional | garantir atomicidade (venda + estoque + financeiro + XP) |
| Idempotência de XP | tabela de eventos + `UNIQUE(source_key)` | impedir XP duplicado é regra crítica do produto |
| Dinheiro | `numeric` no Postgres, nunca float | float JS não é fonte de verdade confiável para dinheiro |
| Auth | Supabase Auth email/senha na v1 | simplicidade inicial, sem travar social login futuro |
| Saúde na bottom nav (mobile) | fora por enquanto (`showInBottomNav: false`), só na sidebar de desktop | bottom nav mobile tem só 5 slots fixos (Hoje·Planejamento·(+)·Progresso·Menu); "Progresso" e "Menu" ainda não existem como telas — ocupar um dos 2 slots reais restantes com Saúde deslocaria Inbox/Configurações. Reavaliar quando "Menu"/"Progresso" existirem (Fase 6) |
| Cálculo de streak compartilhado | movido de `domains/habits/utils/streak.ts` para `shared/lib/streak.ts` | Fase 3 precisa da mesma lógica para devocional e plano de leitura; um segundo domínio consumindo o util de outro violaria a regra de não importar internals entre domínios — `shared/lib` é o lugar certo assim que 2+ domínios precisam do mesmo cálculo puro |
| Modelagem de treino simplificada | `workout_plans` já representa o "treino" nomeado (Treino A/B/C — não existe uma tabela `workouts` separada agrupando vários); `workout_exercises` funde catálogo + vínculo plano↔exercício (não existe tabela `exercises` genérica reutilizável entre planos) | menos tabelas para o mesmo dado real da Fase 2, sem perda de integridade (cada série referencia sessão + exercício via FK, RLS completo). **Limitação conhecida**: o mesmo exercício (ex.: "Supino Reto") cadastrado em dois planos diferentes vira duas linhas de `workout_exercises` sem vínculo entre si — `última carga`/`melhor desempenho`/`volume` são calculados por `workout_exercise_id`, então não se somam entre planos. Aceitável para a Fase 2 (specs de exemplo mostram histórico por plano); se o produto precisar de PR consolidado por exercício entre planos, extrair uma tabela `exercises` catálogo + `workout_exercises` como tabela de vínculo pura, migrando os dados existentes |

## 14. Prioridade em caso de conflito

Integridade dos dados > Segurança > Funcionamento correto > Experiência do
usuário > Simplicidade > Testabilidade > Manutenção > Performance >
Escalabilidade > Novas funcionalidades.
