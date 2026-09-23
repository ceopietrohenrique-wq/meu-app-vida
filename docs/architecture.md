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
- No TypeScript, valores monetários trafegam sempre como **inteiro de
  centavos** (decidido na Fase 4): o Postgres continua `numeric` como fonte
  de verdade, mas a fronteira UI/serviço nunca soma `number` fracionário.
  Parsing (string decimal → centavos) e formatação (centavos → string
  decimal / moeda BRL) passam por `shared/lib/money.ts`, nunca formatação
  manual espalhada pelo código. Zod schemas de formulário validam o campo
  como string decimal (`requiredMoneyInput`/`optionalMoneyInput` em
  `domains/finance/schemas/money-input.ts`) e convertem via essa mesma
  função — nunca `Number(value) * 100`, que reintroduziria erro de
  arredondamento.

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
| Dinheiro em TS | inteiro de centavos, nunca `number` fracionário | evita erro de ponto flutuante em somas repetidas (dashboard, orçamento); Postgres continua `numeric` como fonte de verdade, conversão centralizada em `shared/lib/money.ts` |
| Transferência financeira | uma única linha em `finance_transactions` (`account_id` origem + `transfer_account_id` destino), nunca duas linhas de income/expense | garante por construção que transferência nunca duplica receita/despesa — não há nada para reconciliar entre duas linhas |
| Saldo de conta financeira | sempre calculado (`get_finance_accounts_with_balance`), nunca coluna mutável | mesma filosofia de streak/volume de treino — elimina por construção o risco de saldo dessincronizar ao editar/cancelar transação |
| Cancelamento de transação | soft-delete via `canceled_at`, nunca `DELETE` físico | preserva histórico/auditoria; como o saldo é sempre calculado excluindo `canceled_at is not null`, cancelar nunca deixa o saldo inconsistente |
| Alerta de orçamento | trigger `AFTER INSERT/UPDATE` em `finance_transactions` (não RPC dedicada) | qualquer caminho que insira uma transação (client direto ou geração de recorrência) dispara a checagem sem duplicar a lógica em dois lugares; dedup real é `UNIQUE(budget_id, threshold_percent, period_month)` |
| Ownership cruzado em `finance_transactions`/`finance_recurrences`/`finance_budgets` | triggers dedicados (`*_validate_ownership`) bloqueiam `account_id`/`transfer_account_id`/`category_id` de outro usuário, e também contexto (`pessoal`/`empresarial`) inconsistente entre a transação/recorrência/orçamento e a conta/categoria referenciada | RLS sozinha não impede referenciar o *id* de uma linha de outro usuário que existe de verdade (só impede *ler* essa linha). Cobertura estendida na auditoria Fase 4 para as três tabelas (inicialmente só `finance_transactions` tinha a defesa; `finance_recurrences`/`finance_budgets` ficavam só com RLS — risco fechado após a auditoria explicitamente pedir a regra de consistência de contexto) |
| Idempotência de double-submit em transações financeiras | `client_request_id` (UUID gerado no client por "intenção de envio") + `UNIQUE(user_id, client_request_id)` + RPC `create_finance_transaction` com `ON CONFLICT DO NOTHING` e fallback de leitura | mesma filosofia de `xp_events`/`source_key`, mas para transações que não geram XP; a proteção de UI (botão desabilitado) não é suficiente sozinha (CLAUDE.md > Idempotência e concorrência) — decidido na auditoria Fase 4 após o pedido explícito de comprovar que transferência (e transação em geral) não pode ser aplicada duas vezes por clique duplo/retry |
| Thresholds de alerta configuráveis | `finance_budgets.alert_thresholds smallint[]`, default `{80,90,100}`, em vez de lista fixa no código do trigger | CLAUDE.md/spec pede "80/90/100 como padrão sugerido", não fixo; o trigger `finance_check_budget_alerts` agora itera sobre o array do próprio orçamento — dedup continua sendo a mesma `UNIQUE(budget_id, threshold_percent, period_month)` |
| "Contas próximas" do dashboard | reaproveita `listTransactions` filtrado para `transaction_date > hoje`, sem cancelamento, sem transferência | as ocorrências futuras já existem como linhas reais em `finance_transactions` (geradas por `generate_finance_recurrence_occurrences`) — criar uma tabela/serviço de "previsão" separado duplicaria a fonte de verdade sem necessidade |
| Filtro por período do Financeiro | `PeriodNavigator` (mês anterior/atual/seguinte) sobre `monthOffset`, sem seletor de intervalo customizado na UI | a RPC (`get_finance_dashboard_summary`) já aceita qualquer intervalo arbitrário — só a UI ficou limitada a navegação mensal por ser o que a spec exige (mês atual como padrão, navegação mês a mês); intervalo customizado livre fica para quando houver demanda real, sem exigir mudança de schema/RPC |
| Quick Capture financeiro | reaproveita `createTransactionSchema`/`create_finance_transaction` do domínio `finance` (contexto fixo `pessoal`, `client_request_id` próprio) em vez de uma rota de captura paralela | mantém a regra "nunca duas fontes de verdade para a mesma operação de dinheiro"; o Quick Capture é só mais um ponto de entrada para a mesma RPC |
| Contexto empresarial (Fase 5) | uma única tabela nova, `businesses` (nullable em toda entidade de Negócios) | genérico por exigência explícita (CLAUDE.md > Fase 5 > 1) — nunca modelado para plaquinhas/sites especificamente; reaproveita `finance_accounts`/`finance_categories`/`finance_transactions` (contexto `empresarial`) da Fase 4 em vez de duplicar "conta"/"categoria" dentro de Negócios |
| Lead/cliente como uma entidade só | `customers.stage` (enum) em vez de tabelas separadas `leads` + `customers` com conversão | CLAUDE.md > Fase 5 > 2 pede explicitamente "não criar CRM excessivamente complexo" — uma linha só, o pipeline é só uma coluna |
| Próxima ação do cliente | colunas em `customers` (`next_action*`), não uma tabela de tarefas separada | "deve poder alimentar Dashboard/Hoje futuramente sem duplicação de dados" (CLAUDE.md > Fase 5 > 3) — fonte única desde já, para a Fase 6+ só ler, nunca sincronizar duas tabelas |
| Kit/oferta nunca alterado pela venda | `offers`/`offer_items` são só template; vender gera sempre um snapshot novo em `sale_items` | é o mecanismo que cumpre "permitir customizar oferta para cliente sem alterar o template global" (CLAUDE.md > Fase 5 > 5) sem precisar de uma segunda tabela de "ofertas customizadas" |
| Totais de venda sempre calculados no banco | `create_sale` calcula `gross_amount`/`discount_amount`/`net_amount`/`direct_costs` a partir dos itens recebidos, nunca aceita do client | CLAUDE.md > Fase 5 > 17: "nunca cálculo financeiro apenas no frontend" — o client nunca é a fonte de verdade do total de uma venda |
| Status de venda como fonte única de "o que conta" | `REVENUE_STATUSES = ('confirmed','paid','delivered')` centralizado na RPC do dashboard, nunca recalculado em cada indicador | evita duas definições divergentes de "venda válida" — um único array, todo indicador de receita/custo/margem/ROI/ticket médio/produto mais vendido filtra por ele |
| Efeitos colaterais de venda compartilhados entre criação e transição | `apply_sale_status_effects` extraída como função interna, chamada tanto por `create_sale` (quando já nasce num status comprometido) quanto por `update_sale_status` | auditoria própria da Fase 5: `create_sale` com `p_status='confirmed'` inicialmente NÃO baixava estoque (só `update_sale_status` aplicava o efeito) — bug real corrigido extraindo a lógica para os dois caminhos usarem a mesma implementação, nunca duplicada |
| Idempotência/concorrência de venda | `SELECT ... FOR UPDATE` na venda (serializa chamadas concorrentes) + guards em colunas (`stock_deducted_at`/`stock_reverted_at`/`revenue_transaction_id`), não só `client_request_id` | `client_request_id` sozinho só protege contra reenvio idêntico (retry); duas chamadas concorrentes com client_request_id DIFERENTES (ex.: dois dispositivos) ainda precisam do guard real no estado da linha — mesmo princípio de `xp_events`/Fase 4, adaptado para efeito multi-etapa (estoque + financeiro) |
| Estoque sempre calculado | `get_inventory_levels()` soma `inventory_movements`, nunca uma coluna `quantity_on_hand` mutável | mesma filosofia de saldo de conta (Fase 4) e streak de hábito (Fase 1) — elimina por construção o risco de estoque dessincronizar do histórico real |
| Sem backorder/estoque negativo | estoque insuficiente bloqueia a transição de status com exceção; nenhuma regra de override foi criada | CLAUDE.md > Fase 5 > 8 pede "não permitir estoque negativo sem regra explícita" — nenhuma regra explícita existe ainda, então o padrão seguro (bloquear) é o único comportamento |
| Reembolso não reverte financeiro automaticamente | cancelar/reembolsar reverte estoque, mas não cria uma transação financeira de estorno | mantém `finance_transactions` como histórico imutável (Fase 4); reversão financeira, se necessária, é uma ação manual do usuário na tela de Financeiro — decisão de escopo documentada em `business-rules.md` > Fase 5 > 36, não uma omissão |
| ROI sem entidade de investimento dedicada | ROI = lucro bruto / custo direto (COGS) × 100, como proxy | não existe rastreamento de investimento (ex.: marketing por campanha) nesta fase; fórmula documentada como limitação conhecida em `business-rules.md` > Fase 5 > 39, não como definição final e imutável |
| Meta trimestral (Fase 6) | reaproveita `goals` (Fase 1) com `type='trimestral'`, colunas novas `is_completed`/`parent_goal_id`, em vez de tabela `quarterly_goals` nova | não duplicar conceito já existente; `parent_goal_id` genérico permite meta-filha-de-meta sem precisar de uma segunda hierarquia |
| Vínculo semana↔meta trimestral | `weekly_plans.quarterly_goal_id` (nullable, aditivo) validado por trigger (`weekly_plans_validate_quarterly_goal`) que confirma dono + `type='trimestral'` | mesmo padrão de defesa em profundidade das triggers de ownership da Fase 4/5 — FK sozinha não impede apontar para linha de outro usuário |
| Revisão semanal (Fase 6) | `weekly_reviews`, mesmo padrão de `daily_reviews` (Fase 1): snapshot calculado ao vivo (`get_weekly_review_snapshot`) + reflexão em texto livre, `UNIQUE(user_id, week_start)` com upsert | reaproveita um padrão já validado em produção em vez de inventar um novo formato de encerramento de período |
| Recompensas nunca deduzem XP | "disponível" é sempre `XP total >= xp_cost` calculado ao vivo; `reward_redemptions` só grava `xp_total_at_redemption` como snapshot histórico, imutável (sem UPDATE/DELETE) | XP é filosoficamente um placar cumulativo, nunca uma carteira gastável (CLAUDE.md > XP: idempotente, nunca duplicado) — resgatar é registro de escolha, não transação de saldo |
| Conquistas como condições fixas em SQL | 8 chaves fixas (`ACHIEVEMENT_DEFINITIONS` no código), desbloqueio via `check_and_unlock_achievements()` com `UNIQUE(user_id, achievement_key)` + `ON CONFLICT DO NOTHING`, chamada automaticamente ao abrir `/progresso` | idempotente por construção; condições usam contagens/somas simples (nunca reimplementam o algoritmo de streak de `shared/lib/streak.ts` em SQL) — proporcional ao escopo da fase, documentado como limitação em `business-rules.md` > Fase 6 > 43 |
| Dashboard consolidado reaproveita RPCs existentes | `/progresso` embute `FinanceDashboardCard`/`BusinessDashboardCard` (Fase 4/5) diretamente; só cria `get_progress_summary`/`get_xp_trend` para os domínios sem RPC de período (tarefas, hábitos, treinos, refeições, água, devocional, leitura bíblica, peso) | evita recalcular Financeiro/Negócios numa segunda função — mesmo princípio de fonte única de verdade das fases anteriores |
| Busca global — escopo de 4 entidades | `tasks`, `customers`, `bible_study_notes`, `catalog_items` via `.ilike()` parametrizado em paralelo (`Promise.all`); `ideias`/`notas`/`projetos` explicitamente fora de escopo | essas 3 pastas de domínio são scaffolds vazios desde a Fase 0 — nenhuma fase do roadmap as implementou; busca cobre exatamente o que existe, documentado em `business-rules.md` > Fase 6 > 45 |
| Navegação mobile — Progresso/Menu resolvidos | bottom nav ganha "Progresso" real e um `MenuSheet` (5º slot) agrupando Saúde/Espiritual/Financeiro/Negócios/Inbox/Configurações | resolve a decisão pendente desde a Fase 0 (linha "Saúde na bottom nav" acima, "Reavaliar quando Menu/Progresso existirem") — nenhum item perdeu acesso, só reorganizado |
| `DialogContent` com altura máxima | `max-h-[85vh] overflow-y-auto` adicionado ao componente compartilhado `shared/components/ui/dialog.tsx`, não a um dialog específico | bug real encontrado ao construir o dialog de Revisão Semanal (8 indicadores + 4 textareas): sem isso, o rodapé/botão de salvar ficava fora da viewport em diálogos altos, em qualquer domínio — corrigido na raiz (componente compartilhado) em vez de workaround local, por instrução explícita de não criar dívida técnica |
| PUSH continua camada separada de IN_APP (Fase 7) | `scheduled_notifications` é uma fila NOVA exclusiva do ciclo de vida de push (pending/sent/cancelled/failed); `notifications` (Fase 1) continua a única fonte de verdade de IN_APP, sem sistema paralelo | CLAUDE.md > Fase 7: "reutilize estruturas da Fase 1... evite criar sistema paralelo" — IN_APP nunca teve conceito de fila/retry/quiet-hours porque é síncrono; só PUSH precisa desses conceitos, então só PUSH ganha tabela nova |
| Resumo diário/semanal reaproveitam RPCs da Fase 6 | `get_progress_summary`/`get_weekly_review_snapshot` ganharam parâmetro `p_user_id uuid default auth.uid()` em vez de uma segunda função paralela para o job | job roda sem sessão de usuário (`auth.uid()` é null em background) — precisa calcular para QUALQUER usuário; estender com um parâmetro (default preserva o comportamento de todo call site existente) evita duplicar ~15 subqueries de cada função |
| Jobs de notificação: SECURITY DEFINER + service_role | Todas as funções de geração/seleção/envio (`generate_*`, `select_due_push_notifications`, `mark_push_notification_*`, `deactivate_push_subscription`) revogadas explicitamente de `anon`/`authenticated`, só `service_role` executa | job roda em background via Edge Function com a service_role key — nunca uma sessão de usuário comum; nenhum client deve conseguir gerar/enviar notificação de qualquer usuário chamando a RPC diretamente |
| Lock de concorrência do job via `locked_at` em vez de um 5º status | `scheduled_notifications.status` fica só em `pending/sent/cancelled/failed` (exatamente os 4 pedidos); uma coluna `locked_at` separada marca "em processamento" sem inventar um status `processing` | evita ambiguidade entre "status" (estado de negócio, permanente no histórico) e "lock" (efêmero, para não duas execuções concorrentes do job pegarem a mesma linha) |
| Envio de push fora do Postgres | `select_due_push_notifications` (seleção+revalidação+quiet hours) roda em SQL; o envio HTTP real (Web Push + assinatura VAPID) roda numa Edge Function Deno (`supabase/functions/send-push`) | Web Push exige criptografia (ECDH/HKDF/AES-GCM) e assinatura JWT VAPID via HTTP — inviável em SQL puro; a função usa `npm:web-push` via compat do Deno em vez de reimplementar o protocolo à mão |
| Guard explícito em funções com `p_user_id` | `get_progress_summary`/`get_weekly_review_snapshot` checam `p_user_id is distinct from auth.uid() and auth.role() <> 'service_role'` e lançam exceção, além de já estarem protegidas por RLS implícita (confirmado por teste real) | auditoria final da Fase 7 pediu defesa explícita, não só depender de RLS implícita para uma garantia de segurança crítica — mesmo espírito das triggers de ownership desde a Fase 4 ("RLS sozinha não é suficiente") |
| Categorias de preferência sem gerador ainda ficam marcadas na UI | Dieta/Peso/Negócios mostram "sem lembrete automático ainda"; Financeiro mostra que o alerta de orçamento (Fase 4) não é controlado pelo toggle | auditoria final da Fase 7: nunca expor um toggle que sugira uma automação que não existe de verdade — transparência em vez de silêncio |
| Edge Functions deployadas com `--no-verify-jwt` | `CRON_SECRET` (checado no próprio código) é o único gate de autenticação, não o `verify_jwt` da plataforma | bug real descoberto na ativação: com `verify_jwt: true` (padrão), o gateway aceitava qualquer JWT válido — inclusive a `anon key` pública — antes do código rodar, tornando o `CRON_SECRET` inalcançável; `--no-verify-jwt` move a decisão de autorização inteiramente para dentro da function |
| Scheduler de produção: GitHub Actions, não pg_cron | `.github/workflows/notifications-cron.yml` (schedule `*/15 * * * *` + `workflow_dispatch`), reaproveitando a infra de CI já existente no repositório | mais simples de auditar/versionar/testar manualmente do que configurar `pg_cron`+`pg_net` no Postgres; o repositório já tinha Actions configurado, então não é uma peça nova de infraestrutura — só um workflow a mais |
| Maskable icon reaproveita o ícone de 512 existente | Entrada extra `purpose: "maskable"` no manifest apontando pro mesmo `/icons/icon-512`, sem gerar um ícone novo | o glifo já é centralizado e pequeno o bastante pra caber na "safe zone" de 80% que o SO usa ao recortar — CLAUDE.md/Fase 8 pede explicitamente não criar ícones/splash sem necessidade |
| Sem splash screens manuais do iOS | Nenhuma splash screen estática por tamanho de dispositivo (Apple recomenda dezenas de combinações) — só `theme-color`/`background_color` do manifest + meta tags Apple já existentes desde a Fase 0/7 | CLAUDE.md/Fase 8: "não criar dezenas de splash screens manuais sem necessidade"; iOS usa `background_color`/ícone como splash mínima automática sem precisar de assets extras — trade-off documentado como limitação conhecida do iOS, não uma omissão |
| `viewport-fit: cover` + compensação manual de safe-area | Adicionado ao `viewport` export do layout raiz; toda área que ficaria colada em borda (header do app-shell, bottom nav) ganha `padding` via `env(safe-area-inset-*)` | sem a compensação manual, ativar `viewport-fit: cover` sozinho faria conteúdo real (não só decoração) ficar embaixo do notch/status bar — bug encontrado e corrigido na mesma migration desta fase, nunca versionado separado |
| Cache do service worker: ícones/manifest cache-first, HTML nunca cacheado | `CACHE_NAME` bump pra `app-shell-v2`; só assets estáticos públicos (ícones, manifest, `/_next/static`) entram em cache — nenhuma página HTML (todas dinâmicas/autenticadas) | mesmo racional de nunca cachear dado privado do Supabase (já a regra desde a Fase 0): como toda rota do `(app)` é `ƒ` (server-rendered com verificação de sessão), cachear o HTML arriscaria vazar conteúdo de um usuário pro próximo que abrir o app no mesmo browser |
| Lazy loading de Recharts/cmdk via `next/dynamic` | `WeightTrendChart`/`XpTrendChart`/`GlobalSearchCommand` carregados sob demanda (`ssr:false`), `GlobalSearchCommand` só monta depois do primeiro uso (`hasOpenedOnce`) | essas 3 dependências são pesadas e usadas só em contextos específicos (gráfico de uma tela, busca acionada por atalho) — nunca deveriam entrar no bundle inicial de toda rota; decisão de performance medida via Lighthouse antes de aplicar (CLAUDE.md/Fase 8: "medir antes de otimizar") |
| Lighthouse rodado via script próprio (`scripts/lighthouse.mjs`), não só CLI | Reaproveita o Chromium do Playwright (evita depender de Chrome instalado à parte) e suporta um modo autenticado (login real via Playwright, cookie repassado pro Lighthouse) | a CLI `lighthouse` sozinha só audita páginas públicas sem sessão — o app é quase todo autenticado; um script fino em cima da API Node do Lighthouse foi a forma mais simples de auditar o app de verdade, não só a tela de login |
| Categoria "PWA" do Lighthouse não é mais perseguida como score | Instalabilidade garantida por testes próprios (`manifest.test.ts`, `fase8-pwa.spec.ts`), não por um score de categoria | a versão do Lighthouse usada (13.5.0) não expõe mais uma categoria "pwa" pontuada — comportamento upstream, já previsto no pedido original da fase ("PWA/instalabilidade quando a versão da ferramenta expuser essa categoria") |



## 14. Prioridade em caso de conflito

Integridade dos dados > Segurança > Funcionamento correto > Experiência do
usuário > Simplicidade > Testabilidade > Manutenção > Performance >
Escalabilidade > Novas funcionalidades.
