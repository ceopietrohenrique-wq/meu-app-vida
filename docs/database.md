# Modelo de Dados — Fase 0, Fase 1, Fase 2, Fase 3, Fase 4 e Fase 5

> Este documento cobre as tabelas necessárias para a Fase 0 (Fundação),
> Fase 1 (Núcleo de execução), Fase 2 (Saúde), Fase 3 (Espiritual), Fase 4
> (Financeiro) e Fase 5 (Negócios). Tabelas de Progresso e Notificações Push
> serão documentadas nos respectivos `database.md` incrementais (ou seção
> adicional) quando essas fases começarem. Ver `docs/roadmap.md` para a
> ordem completa.

## Convenções

- PK sempre `uuid` (`gen_random_uuid()` / `uuid_generate_v4()`).
- `snake_case` em todas as colunas e tabelas.
- Toda tabela com dado de usuário tem coluna `user_id uuid not null
  references auth.users(id)` e RLS habilitado com policy
  `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE.
- Timestamps: `created_at timestamptz not null default now()`,
  `updated_at timestamptz not null default now()` (mantido via trigger),
  mais `completed_at`/`archived_at` quando fizer sentido semântico. Soft
  delete (`deleted_at`) só é usado onde explicitamente justificado — não é
  padrão automático.
- Datas "de calendário" (ex.: dia do hábito) usam `date`, nunca
  `timestamptz`, para não sofrer deslocamento de fuso ao redor da meia-noite.
  `profiles.timezone` é a referência para converter "agora" em "data local
  do usuário" antes de gravar.

---

## Fase 0 — Fundação

### `profiles`

Perfil estendido do usuário (1:1 com `auth.users`).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| name | text | |
| timezone | text | default `'America/Sao_Paulo'` |
| week_start | smallint | 0=domingo..6=sábado, default 1 (segunda) |
| currency | text | default `'BRL'` |
| weekly_xp_goal | integer | usado já na Fase 1, default configurável no onboarding |
| onboarding_completed_at | timestamptz | null até concluir onboarding |
| created_at / updated_at | timestamptz | |

RLS: usuário só vê/edita seu próprio `profiles` (`id = auth.uid()`).

### `life_areas`

Áreas da vida, usadas para classificar tarefas/hábitos/metas.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | ex.: Saúde, Espiritual, Financeiro, Negócios, Pessoal |
| color | text | token semântico, não hex livre |
| is_default | boolean | áreas sugeridas criadas no onboarding |
| created_at | timestamptz | |

Seed: as áreas sugeridas da spec (Saúde, Espiritual, Financeiro, Negócios,
Conhecimento, Relacionamentos, Pessoal, Trabalho) são inseridas por usuário
no onboarding/seed de desenvolvimento, com `is_default = true`.

---

## Fase 1 — Núcleo de execução

### `tasks`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| title | text not null | |
| description | text | nullable |
| priority | text | check in (`baixa`,`media`,`alta`,`critica`) |
| status | text | check in (`pendente`,`em_andamento`,`concluida`,`cancelada`), default `pendente` |
| due_date | date | nullable |
| due_time | time | nullable |
| estimated_minutes | integer | nullable, `> 0` quando presente |
| life_area_id | uuid FK → life_areas | nullable |
| project_id | uuid FK → projects | nullable (tabela `projects` chega na Fase 6/quando o domínio projects for implementado; coluna criada desde já como nullable para não exigir migration de novo depois) |
| goal_id | uuid FK → goals | nullable, mesma lógica acima |
| xp_reward | integer not null default 10 | `>= 0` |
| recurrence_id | uuid FK → task_recurrences | nullable |
| created_at / updated_at | timestamptz | |
| completed_at | timestamptz | nullable, setado quando `status = concluida` |

Índices: `(user_id, status)`, `(user_id, due_date)`.

### `task_recurrences`

Define a regra de recorrência; ocorrências viram linhas independentes em
`tasks` (nunca sobrescrevem histórico).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| frequency | text | `diaria`, `semanal`, `mensal`, `dias_da_semana` |
| days_of_week | smallint[] | usado quando `frequency = dias_da_semana` |
| interval | integer | ex.: a cada 2 semanas |
| starts_on | date | |
| ends_on | date | nullable = sem fim |
| created_at | timestamptz | |

Geração das ocorrências futuras é responsabilidade do `service` do domínio
`tasks` (job ou geração sob demanda ao abrir "Hoje"/"Próximas") — detalhado
em `business-rules.md` quando implementado; a garantia de "não duplicar
ocorrência" usa `UNIQUE(recurrence_id, due_date)`.

### `habits`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| description | text | nullable |
| frequency | text | `diaria`, `semanal`, `dias_da_semana` |
| days_of_week | smallint[] | quando aplicável |
| target_time | time | nullable, horário sugerido |
| category | text | livre/mapeado a `life_areas` futuramente |
| xp_reward | integer not null default 10 | |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

### `habit_logs`

Cada execução é uma linha própria — **nunca** um boolean único no hábito.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| habit_id | uuid FK → habits | |
| date | date not null | data local do usuário |
| completed_at | timestamptz not null default now() | |
| value | numeric | opcional (ex.: litros de água se o hábito for quantitativo) |
| created_at | timestamptz | |

Constraint: `UNIQUE(habit_id, date)` — impede log duplicado no mesmo dia (e
serve de base para a idempotência do XP de hábito). Streak/melhor
streak/taxa de conclusão são **calculados**, não armazenados como coluna
mutável (ver `business-rules.md`).

### `goals`

Versão mínima necessária para a Fase 1 (metas semanais ligadas ao
planejamento semanal). Tipos mensal/trimestral/anual completos evoluem nas
fases seguintes, mas a tabela já nasce genérica.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| title | text not null | |
| type | text | `semanal`,`mensal`,`trimestral`,`anual`,`personalizada` |
| kind | text | `resultado` ou `processo` |
| period_start | date | |
| period_end | date | |
| target_value | numeric | nullable |
| current_value | numeric | nullable, calculado quando possível |
| life_area_id | uuid FK → life_areas | nullable |
| created_at / updated_at | timestamptz | |

### `weekly_plans`

Suporte ao fluxo de Planejamento Semanal.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| week_start | date not null | respeita `profiles.week_start` |
| top_priorities | text[] | até 3 prioridades da semana |
| planned_workouts | integer | nullable |
| weekly_xp_goal | integer | nullable, pode sobrepor `profiles.weekly_xp_goal` só naquela semana |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

Constraint: `UNIQUE(user_id, week_start)`.

### `xp_events`

Tabela central de gamificação — ver regras completas em
`business-rules.md`.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| event_type | text | ex.: `TASK_COMPLETED`, `HABIT_COMPLETED` |
| entity_type | text | `task`, `habit`, ... |
| entity_id | uuid | id da entidade de origem |
| xp_amount | integer not null | `> 0` (XP nunca é negativo — sem punição) |
| source_key | text not null | chave de idempotência, ver fórmulas na Fase 1 |
| created_at | timestamptz not null default now() | |

Constraint crítica: `UNIQUE(user_id, source_key)`. É essa constraint —
não o frontend — que garante que XP nunca é concedido duas vezes.

Índices: `(user_id, created_at)` para agregações diárias/semanais.

### `inbox_items`

Inbox Universal (captura rápida antes de decidir onde organizar).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| content | text not null | texto livre capturado |
| source_type | text | `texto`,`ideia`,`tarefa`,`link`,`nota`,`lembrete`,... |
| status | text | `inbox`,`processado`,`arquivado`, default `inbox` |
| converted_to_type | text | nullable, ex.: `task`, `idea`, `note` |
| converted_to_id | uuid | nullable |
| created_at / updated_at | timestamptz | |

### `notifications` (in-app, básico)

Somente o necessário para notificações internas da Fase 1. Push
(`push_subscriptions`, preferências completas) chega na Fase 7.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| type | text | ex.: `TASK_REMINDER`, `XP_MILESTONE` |
| title | text not null | |
| body | text | |
| notification_key | text | chave de deduplicação, nullable no MVP in-app |
| read_at | timestamptz | nullable |
| created_at | timestamptz | |

Constraint: `UNIQUE(user_id, notification_key)` quando `notification_key`
não é nulo — evita duplicar o mesmo aviso.

### `daily_reviews`

Encerramento do dia (Fase 1 pede o fluxo básico; campos de saúde/finanças
detalhados chegam quando os domínios existirem — por ora ficam como
snapshot livre em JSON para não travar em colunas que ainda não têm dado
real).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date not null | |
| tasks_completed | integer | snapshot no momento do encerramento |
| tasks_total | integer | |
| xp_earned | integer | |
| carry_over_note | text | resposta a "algo para levar para amanhã?" |
| created_at | timestamptz | |

Constraint: `UNIQUE(user_id, date)`.

---

---

## Fase 2 — Saúde

`profiles.height_cm` (numeric, nullable) foi adicionada nesta fase — altura
usada como valor padrão sugerido na calculadora de IMC.

### `weight_logs`

Histórico de peso. **Nunca sobrescrito** — cada pesagem é uma linha nova.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| weight_kg | numeric not null | `> 0 and < 500` |
| date | date not null | data local do usuário |
| notes | text | nullable |
| created_at | timestamptz | |

Sem policy de UPDATE (só select/insert/delete) — reforça a imutabilidade.
Índice `(user_id, date)`.

### `weight_goals`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| target_weight_kg | numeric not null | `> 0 and < 500` |
| target_date | date | nullable |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

Índice único parcial `(user_id) where is_active` — no máximo uma meta ativa
por usuário. Trocar de meta é atômico via RPC `set_weight_goal`.

### `body_measurements`

Medidas opcionais (cintura, quadril, peito, braço, coxa), vinculadas a uma
data, histórico completo (não sobrescreve).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date not null | |
| waist_cm / hip_cm / chest_cm / arm_cm / thigh_cm | numeric | todos nullable, mas ao menos um precisa estar presente (check) |
| notes | text | nullable |
| created_at | timestamptz | |

### `bmi_records`

Histórico opcional de cálculos de IMC (salvar é opt-in — calcular não exige
salvar). Ver `business-rules.md` para a fórmula/validação.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| weight_kg / height_cm / bmi | numeric not null | todos `> 0` |
| category | text not null | classificação textual (ex.: "Peso normal") |
| created_at | timestamptz | |

### `water_settings`

1:1 com o usuário (mesmo padrão de `profiles`, PK = `user_id`).

| coluna | tipo | notas |
|---|---|---|
| user_id | uuid PK/FK | |
| daily_goal_ml | integer not null default 2000 | `> 0 and <= 10000` |
| updated_at | timestamptz | |

### `water_logs`

Log por evento (cada "+250ml" é uma linha) — nunca um contador mutável.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date not null | |
| amount_ml | integer not null | `> 0 and <= 5000` |
| created_at | timestamptz | |

### `meal_plans`

Refeições planejadas (template recorrente, ex.: Café da manhã, Almoço).
Macros/calorias sempre nullable — adesão é a prioridade, não contagem
completa.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| time | time | nullable |
| items | text | descrição livre |
| calories / protein_g / carbs_g / fat_g | numeric | todos nullable |
| order_index | integer not null default 0 | |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

### `meal_logs`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| meal_plan_id | uuid FK → meal_plans | |
| date | date not null | |
| status | text | `realizada`, `parcial`, `nao_realizada` |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

Constraint `UNIQUE(meal_plan_id, date)` — um status por refeição por dia,
base do upsert via RPC `set_meal_log_status` e da idempotência do XP de
adesão.

### `workout_plans`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | ex.: "Treino A (Peito+Tríceps)" |
| muscle_groups | text | nullable, descrição livre |
| notes | text | nullable |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

### `workout_exercises`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| workout_plan_id | uuid FK → workout_plans | |
| name | text not null | |
| muscle_group | text | nullable |
| order_index | integer not null default 0 | |
| planned_sets | integer | nullable, `> 0` |
| planned_reps | text | nullable, texto livre (ex.: "8-12") |
| planned_load_kg | numeric | nullable |
| rest_seconds | integer | nullable |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

### `workout_sessions`

Execução real de um plano num dia. `completed_at` nulo = treino em
andamento.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| workout_plan_id | uuid FK → workout_plans | nullable (permite treino avulso) |
| date | date not null | |
| started_at | timestamptz not null default now() | |
| completed_at | timestamptz | nullable |
| notes | text | nullable |
| created_at | timestamptz | |

### `exercise_sets`

Cada série é uma linha própria (carga, repetições, ordem).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| workout_session_id | uuid FK → workout_sessions | |
| workout_exercise_id | uuid FK → workout_exercises | |
| set_order | integer not null | `> 0` |
| load_kg | numeric | nullable |
| reps | integer | nullable |
| created_at | timestamptz | |

### `walk_logs`

Registro simples de caminhada (só para sustentar o comportamento "caminhada"
da lista de XP de saúde — não é um domínio de cardio completo).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date not null | |
| duration_minutes | integer not null | `> 0 and <= 600` |
| distance_km | numeric | nullable |
| notes | text | nullable |
| created_at | timestamptz | |

Todas as tabelas desta fase têm RLS habilitado com policies
`auth.uid() = user_id` (SELECT/INSERT no mínimo; UPDATE/DELETE quando o dado
é editável — ver comentários inline nas migrations para as exceções
propositais de imutabilidade, ex.: `weight_logs` sem UPDATE).

## Fase 3 — Espiritual

### `devotionals`

Um registro por dia (`UNIQUE(user_id, date)`) — reenviar o mesmo dia faz
upsert, nunca cria um segundo registro. Diferente de `weight_logs`, aqui
existe policy de UPDATE (faz sentido completar o devocional ao longo do
dia).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date not null | data local do usuário |
| passage / theme / reflection / learning / application / prayer / notes | text | todos nullable |
| duration_minutes | integer | nullable, `> 0` |
| read_done / reflection_done / prayer_done | boolean not null default false | checklist de leitura/reflexão/oração |
| created_at / updated_at | timestamptz | |

### `bible_study_notes`

Notas de estudo bíblico associadas a uma passagem.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| book | text not null | |
| chapter | smallint not null | `> 0` |
| verse_start / verse_end | smallint | nullable, `verse_end >= verse_start` |
| title | text not null | |
| personal_interpretation / context / questions / application | text | nullable |
| cross_references | text[] | nullable |
| tags | text[] | nullable, índice GIN para busca |
| created_at / updated_at | timestamptz | |

### `reading_plans`

Planos de leitura personalizados. `source`/`template_key` deixam a
estrutura pronta para planos predefinidos no futuro sem exigir migration
nova — nenhum catálogo de planos predefinidos existe ainda (ver
`docs/architecture.md`).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| start_date | date not null | |
| total_days | integer not null | `> 0` |
| source | text not null default `'custom'` | `custom` ou `predefined` |
| template_key | text | nullable, referência a um template futuro |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

### `reading_plan_logs`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| reading_plan_id | uuid FK → reading_plans | |
| day_number | integer not null | `> 0` |
| date | date not null | data local em que o dia foi concluído |
| notes | text | nullable |
| created_at | timestamptz | |

Constraint `UNIQUE(reading_plan_id, day_number)` — nunca duplica a
conclusão do mesmo dia (mesmo padrão de `habit_logs`/`meal_logs`).

### `prayers`

"Transformar um pedido em oração respondida mantendo histórico" é uma
transição de `type` no mesmo registro (não um novo registro) — histórico
preservado via `requested_at`/`answered_at`/`updated_at`.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| type | text not null | `pedido`, `agradecimento`, `respondida` |
| description | text not null | |
| requested_at | date not null | |
| answered_at | date | nullable; obrigatório quando `type = 'respondida'` (check) |
| notes | text | nullable |
| created_at / updated_at | timestamptz | |

### `saved_verses`

Sem integração externa nesta fase — `notes` é sempre texto do próprio
usuário, nunca buscado de uma API bíblica.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| reference | text not null | ex.: "João 3:16" |
| book | text not null | |
| chapter | smallint not null | `> 0` |
| verse_start | smallint not null | `> 0` |
| verse_end | smallint | nullable, `>= verse_start` |
| notes | text | nullable, notas do usuário |
| tags | text[] | nullable, índice GIN |
| created_at | timestamptz | |

Todas as tabelas desta fase têm RLS habilitado com policies
`auth.uid() = user_id`.

## Fase 4 — Financeiro

Dinheiro é sempre `numeric` no Postgres (nunca float). No TypeScript, todo
valor monetário trafega como inteiro de centavos, convertido num único lugar
centralizado (`shared/lib/money.ts`) — ver `docs/architecture.md` > Dinheiro.

### `finance_accounts`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| type | text not null | `carteira`, `conta_bancaria`, `cartao`, `caixa_empresa`, `outra` |
| initial_balance | numeric not null default 0 | opcional na criação (default 0) |
| is_active | boolean not null default true | |
| context | text not null | `pessoal` ou `empresarial` |
| created_at / updated_at | timestamptz | |

Saldo **nunca** é uma coluna mutável — é sempre calculado por
`get_finance_accounts_with_balance()` a partir de `initial_balance` +
`finance_transactions` não canceladas (mesma filosofia de streak/volume de
treino calculados, não armazenados).

### `finance_categories`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| context | text not null | `pessoal` ou `empresarial` |
| created_at | timestamptz | |

`UNIQUE(user_id, context, name)` evita duplicação sem impedir o mesmo nome
em contextos diferentes ou entre usuários diferentes.

### `finance_transactions`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| account_id | uuid FK → finance_accounts | |
| type | text not null | `income`, `expense`, `transfer` |
| context | text not null | `pessoal` ou `empresarial` |
| amount | numeric not null | sempre `> 0` — o efeito no saldo depende do `type`, nunca do sinal |
| description | text | nullable |
| category_id | uuid FK → finance_categories | nullable |
| transaction_date | date not null | |
| payment_method | text | nullable |
| business_id / sale_id | uuid FK → businesses/sales | nullable; FK adicionada de verdade na Fase 5 quando essas tabelas passaram a existir (migration `20260927010000`/`20260927010600`) — mesma lógica de `tasks.project_id` na Fase 1 |
| transfer_account_id | uuid FK → finance_accounts | nullable; obrigatório e `<> account_id` quando `type = 'transfer'`, sempre nulo nos demais tipos (check) |
| recurrence_id | uuid FK → finance_recurrences | nullable |
| notes | text | nullable |
| canceled_at | timestamptz | nullable — "cancelar" é soft-delete (nunca DELETE físico), excluído do saldo/dashboard |
| client_request_id | uuid | nullable — chave de idempotência de double-submit (auditoria Fase 4 > 1), gerada uma vez no client por "intenção de envio" |
| created_at / updated_at | timestamptz | |

Transferência é **uma única linha** (`account_id` origem + `transfer_account_id`
destino) — nunca duas linhas de income/expense, o que garante que
transferências não duplicam receita/despesa.

Índices: `(user_id, transaction_date)`, `(user_id, account_id)`,
`(user_id, category_id)`, único parcial `(recurrence_id, transaction_date)
where recurrence_id is not null` (idempotência da geração de recorrência),
único parcial `(user_id, client_request_id) where client_request_id is not
null` (idempotência de double-submit).

Criar transação (client) sempre passa pela RPC `create_finance_transaction`,
nunca por um `INSERT` direto — é ela que garante atomicidade + idempotência
via `ON CONFLICT (user_id, client_request_id) DO NOTHING` seguido de leitura
da linha já existente quando a chave já foi usada. Testes de banco (via
`.from().insert()` direto) continuam funcionando porque a RPC é uma
conveniência sobre a tabela, não a única via de escrita permitida por RLS.

Trigger `finance_transactions_validate_ownership`: bloqueia
`account_id`/`transfer_account_id`/`category_id` apontando para conta/categoria
de OUTRO usuário, e também bloqueia contexto inconsistente — uma transação
`pessoal` não pode usar conta/categoria `empresarial` (e vice-versa),
inclusive a conta de destino de uma transferência (auditoria Fase 4 > 7).
Mesma defesa (ownership + contexto) existe em `finance_recurrences`
(`finance_recurrences_validate_ownership`) e `finance_budgets`
(`finance_budgets_validate_ownership`).

### `finance_recurrences`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| type | text not null | `income` ou `expense` |
| context | text not null | |
| account_id | uuid FK → finance_accounts | |
| category_id | uuid FK → finance_categories | nullable |
| payment_method | text | nullable |
| amount | numeric not null | `> 0` |
| day_of_month | smallint not null | 1-31; meses mais curtos usam o último dia do mês |
| starts_on | date not null | |
| ends_on | date | nullable |
| total_installments | integer | nullable — null = sem fim por quantidade (assinatura), preenchido = parcelamento com fim (ex.: 12x) |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

Ocorrências viram linhas próprias em `finance_transactions` via
`generate_finance_recurrence_occurrences(p_recurrence_id, p_until)` — nunca
sobrescritas, geração idempotente (mesmo padrão de `task_recurrences`).

### `finance_budgets`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| category_id | uuid FK → finance_categories | |
| context | text not null | |
| period_month | date not null | sempre normalizado para o dia 1 do mês (check) |
| planned_amount | numeric not null | `> 0` |
| alert_thresholds | smallint[] not null default `{80,90,100}` | percentuais que disparam alerta — configurável por orçamento na criação; 80/90/100 é só o padrão sugerido (auditoria Fase 4 > 5), cada valor entre 1 e 500 |
| created_at / updated_at | timestamptz | |

`UNIQUE(user_id, category_id, period_month)` — um orçamento por categoria
por mês. Planejado/realizado/restante/percentual são calculados (nunca
armazenados) — ver `src/domains/finance/utils/budget-progress.ts`.

### `finance_budget_alerts`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| budget_id | uuid FK → finance_budgets | |
| threshold_percent | smallint not null | qualquer valor entre 1 e 500 — o conjunto realmente usado é `finance_budgets.alert_thresholds` daquele orçamento |
| period_month | date not null | |
| notified_at | timestamptz not null default now() | |

`UNIQUE(budget_id, threshold_percent, period_month)` é a garantia real de
deduplicação — o mesmo threshold nunca notifica duas vezes no mesmo período.
Inserido pelo trigger `finance_check_budget_alerts` (AFTER INSERT/UPDATE em
`finance_transactions`), que também insere em `notifications` (reaproveitada
da Fase 1) com `notification_key = 'BUDGET_ALERT:{budget_id}:{threshold}:{period_month}'`.
Sem policy de UPDATE/DELETE — histórico de alertas é imutável.

Todas as tabelas desta fase têm RLS habilitado com policies
`auth.uid() = user_id`.

## Fase 5 — Negócios

Arquitetura genérica (CLAUDE.md > Fase 5 > 1): nenhuma tabela é modelada
para um tipo específico de negócio. `businesses` é o único conceito novo de
"contexto empresarial" — reaproveita `finance_accounts`/`finance_categories`/
`finance_transactions` (contexto `empresarial`) já existentes, nunca duplica
"conta"/"categoria" dentro de Negócios.

### `businesses`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text not null | |
| segment | text | nullable |
| notes | text | nullable |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

Um usuário pode ter zero, um ou vários negócios. Toda entidade de Negócios
tem `business_id` nullable (sem negócio específico = compartilhado).

### `customers`

Lead e cliente são a MESMA entidade em estágios diferentes do pipeline
(`stage`) — nunca duas tabelas separadas.

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| business_id | uuid FK → businesses | nullable |
| name | text not null | |
| company / phone / whatsapp / instagram / email / segment / city / notes | text | todos nullable |
| stage | text not null default `possivel_cliente` | `possivel_cliente`, `contato_feito`, `interessado`, `proposta_enviada`, `negociacao`, `fechado`, `perdido` |
| next_action / next_action_notes | text | nullable |
| next_action_date | date | nullable |
| next_action_time | time | nullable |
| created_at / updated_at | timestamptz | |

"Próxima ação" fica em colunas na própria linha (nunca uma tabela à parte):
um cliente ativo tem no máximo uma próxima ação pendente por vez — fonte
única para o Dashboard/Hoje consumir no futuro sem duplicar dado.

### `customer_interactions`

Histórico de interações — imutável (sem UPDATE/DELETE).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| customer_id | uuid FK → customers | |
| type | text not null | `ligacao`, `whatsapp`, `instagram`, `visita`, `email`, `proposta`, `nota` |
| notes | text | nullable |
| occurred_at | timestamptz not null default now() | |
| created_at | timestamptz | |

### `catalog_items`

Item genérico — produto físico ou serviço (`type`).

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| business_id | uuid FK → businesses | nullable |
| name | text not null | |
| type | text not null | `produto` ou `servico` |
| description | text | nullable |
| default_price | numeric not null | `>= 0` — só o PADRÃO sugerido, nunca lido no momento da venda (ver `sale_items`) |
| default_cost | numeric not null default 0 | `>= 0` |
| is_active | boolean not null default true | |
| sku | text | nullable |
| tracks_inventory | boolean not null default false | check: só `type = 'produto'` pode ser `true` |
| category | text | nullable |
| created_at / updated_at | timestamptz | |

### `offers` / `offer_items`

Kits/ofertas são só o TEMPLATE — vender uma oferta nunca escreve nela,
sempre gera um snapshot em `sale_items` (ver abaixo), então customizar uma
oferta para um cliente específico nunca altera o template global.

`offers`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| business_id | uuid FK → businesses | nullable |
| name | text not null | |
| description | text | nullable |
| discount_type | text | nullable, `percent` ou `fixed` |
| discount_value | numeric | nullable; percent = 0-100, fixed = valor em reais |
| is_active | boolean not null default true | |
| created_at / updated_at | timestamptz | |

`offer_items`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| offer_id | uuid FK → offers | |
| catalog_item_id | uuid FK → catalog_items | |
| quantity | integer not null | `> 0` |
| unit_price_override | numeric | nullable — null usa `catalog_items.default_price` |
| created_at | timestamptz | |

### `sales` / `sale_items`

`gross_amount`/`discount_amount`/`net_amount`/`direct_costs` em `sales` são
SEMPRE calculados pela RPC `create_sale` a partir de `sale_items` — nunca
digitados livremente. `sale_items` é sempre um snapshot (nome, tipo, preço,
custo, desconto) no momento da venda — mudar o preço futuro do catálogo
NUNCA altera uma venda antiga, porque a venda não lê `catalog_items` de novo
depois de criada.

`sales`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| business_id | uuid FK → businesses | nullable |
| customer_id | uuid FK → customers | nullable |
| account_id | uuid FK → finance_accounts | nullable — reflexo financeiro automático é opt-in por venda |
| status | text not null default `draft` | `draft`, `negotiating`, `confirmed`, `paid`, `delivered`, `cancelled`, `refunded` |
| gross_amount / discount_amount / net_amount / direct_costs / fees | numeric | todos `>= 0`; `discount_amount <= gross_amount` |
| payment_method / responsible / notes | text | nullable |
| sale_date | date not null | |
| client_request_id | uuid | nullable — idempotência de double-submit na criação |
| stock_deducted_at / stock_reverted_at | timestamptz | nullable — guards de idempotência dos efeitos colaterais |
| revenue_transaction_id | uuid FK → finance_transactions | nullable — guard + link do lançamento de receita |
| created_at / updated_at | timestamptz | |

`UNIQUE(user_id, client_request_id)` parcial garante que reenviar a mesma
chave nunca cria uma segunda venda.

`sale_items`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| sale_id | uuid FK → sales | |
| catalog_item_id | uuid FK → catalog_items | `on delete restrict` — preserva o histórico mesmo se o item for descontinuado |
| item_name / item_type | text | snapshot |
| quantity | integer not null | `> 0` |
| unit_price / unit_cost / discount_amount / total | numeric | snapshot, todos `>= 0` |
| tracks_inventory | boolean not null | snapshot — decide se a venda baixa estoque |
| created_at | timestamptz | |

Sem policy de UPDATE/DELETE em `sale_items` — snapshot imutável; corrigir
uma venda em draft/negotiating é excluir a venda inteira (cascade) e
recriar. `sales` não pode ser excluída fora de `draft`/`negotiating`
(trigger `sales_prevent_delete_committed`) — só cancelar/reembolsar via
status.

### `inventory_settings` / `inventory_movements`

Estoque atual NUNCA é uma coluna mutável — é sempre a soma de
`inventory_movements` (mesma filosofia de saldo de conta na Fase 4 e streak
de hábito na Fase 1), exposta via RPC `get_inventory_levels()`.
`inventory_settings` guarda só a configuração (estoque mínimo).

`inventory_settings`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| catalog_item_id | uuid FK → catalog_items | `UNIQUE` |
| minimum_quantity | integer | nullable, `>= 0` |
| created_at / updated_at | timestamptz | |

`inventory_movements`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| catalog_item_id | uuid FK → catalog_items | |
| type | text not null | `entrada`, `saida`, `ajuste`, `venda`, `estorno` |
| quantity_delta | integer not null | `<> 0`; sinal já embutido (negativo = saída) |
| reference_sale_id | uuid FK → sales | nullable; obrigatório quando `type` é `venda`/`estorno`, sempre nulo nos demais (check) |
| notes | text | nullable |
| client_request_id | uuid | nullable — idempotência de double-submit em lançamentos manuais |
| created_at | timestamptz | |

Sem policy de UPDATE/DELETE — histórico imutável; uma correção é um novo
movimento `ajuste`.

### RPCs de Negócios

- `create_sale(...)`: cria `sales` + `sale_items` numa única transação,
  idempotente via `client_request_id`. Se a venda já nasce num status
  comprometido (`confirmed`/`paid`/`delivered`), aplica os mesmos efeitos de
  `update_sale_status` (baixa de estoque com validação de disponibilidade,
  lançamento de receita) — nunca "esquece" de aplicar por ter sido criada
  direto nesse status.
- `update_sale_status(p_sale_id, p_new_status, p_client_request_id)`:
  transição atômica de status, com `SELECT ... FOR UPDATE` (serializa
  chamadas concorrentes sobre a mesma venda) + guards
  (`stock_deducted_at`/`stock_reverted_at`/`revenue_transaction_id`) que
  garantem que baixa de estoque, estorno e lançamento de receita acontecem
  no máximo uma vez cada, independente de quantas vezes a RPC for chamada.
- `apply_sale_status_effects(...)`: função interna compartilhada pelas duas
  RPCs acima — nunca duplicar a lógica de efeitos colaterais em dois
  lugares.
- `get_inventory_levels()`: saldo de estoque calculado por item.
- `get_business_dashboard_summary(p_period_start, p_period_end,
  p_business_id)`: todos os indicadores do dashboard empresarial — ver
  `docs/business-rules.md` > Fase 5 > Definições dos indicadores.

Todas as tabelas desta fase têm RLS habilitado com policies
`auth.uid() = user_id`, mais triggers de validação de ownership (e, em
`finance_transactions`, de contexto) para `business_id`/`customer_id`/
`account_id`/`catalog_item_id`/`sale_id` — nunca só a FK, que só garante
que a linha referenciada existe, não que pertence ao mesmo usuário.

## Relacionamentos-chave (Fase 0/1/2/3/4/5)

```
auth.users (1) — (1) profiles
profiles (1) — (N) life_areas
profiles (1) — (N) tasks
task_recurrences (1) — (N) tasks
profiles (1) — (N) habits
habits (1) — (N) habit_logs
profiles (1) — (N) goals
profiles (1) — (N) weekly_plans
profiles (1) — (N) xp_events
profiles (1) — (N) inbox_items
profiles (1) — (N) notifications
profiles (1) — (N) daily_reviews
profiles (1) — (N) weight_logs
profiles (1) — (N) weight_goals
profiles (1) — (N) body_measurements
profiles (1) — (N) bmi_records
profiles (1) — (1) water_settings
profiles (1) — (N) water_logs
profiles (1) — (N) meal_plans
meal_plans (1) — (N) meal_logs
profiles (1) — (N) workout_plans
workout_plans (1) — (N) workout_exercises
profiles (1) — (N) workout_sessions
workout_sessions (1) — (N) exercise_sets
workout_exercises (1) — (N) exercise_sets
profiles (1) — (N) walk_logs
profiles (1) — (N) devotionals
profiles (1) — (N) bible_study_notes
profiles (1) — (N) reading_plans
reading_plans (1) — (N) reading_plan_logs
profiles (1) — (N) prayers
profiles (1) — (N) saved_verses
profiles (1) — (N) finance_accounts
profiles (1) — (N) finance_categories
finance_accounts (1) — (N) finance_transactions
finance_categories (1) — (N) finance_transactions
finance_accounts (1) — (N) finance_recurrences
finance_recurrences (1) — (N) finance_transactions
finance_categories (1) — (N) finance_budgets
finance_budgets (1) — (N) finance_budget_alerts
profiles (1) — (N) businesses
businesses (1) — (N) customers
customers (1) — (N) customer_interactions
businesses (1) — (N) catalog_items
businesses (1) — (N) offers
offers (1) — (N) offer_items
catalog_items (1) — (N) offer_items
businesses (1) — (N) sales
customers (1) — (N) sales
finance_accounts (1) — (N) sales
sales (1) — (N) sale_items
catalog_items (1) — (N) sale_items
catalog_items (1) — (1) inventory_settings
catalog_items (1) — (N) inventory_movements
sales (1) — (N) inventory_movements
sales (1) — (0..1) finance_transactions (via revenue_transaction_id)
```

## Notas de simplificação

- `project_id`/`goal_id` em `tasks` já existem como colunas nullable desde a
  Fase 1 para não exigir uma migration destrutiva depois, mas a tabela
  `projects` só é criada quando o domínio `projects` for implementado
  (Fase 6, "Progresso", ou antes se a necessidade aparecer — decisão a
  documentar aqui quando ocorrer).
- `daily_reviews` guarda apenas snapshot agregado simples na Fase 1; não
  referencia diretamente tabelas de saúde/financeiro que ainda não existem.
- Streaks de hábito **não** são coluna — são derivadas de `habit_logs` via
  query/service, evitando estado duplicado que pode dessincronizar do
  histórico real (ver `business-rules.md`).
