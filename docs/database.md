# Modelo de Dados — Fase 0 e Fase 1

> Este documento cobre **somente** as tabelas necessárias para a Fase 0
> (Fundação) e Fase 1 (Núcleo de execução). Tabelas de Saúde, Espiritual,
> Financeiro, Negócios, Progresso e Notificações Push serão documentadas nos
> respectivos `database.md` incrementais (ou seção adicional) quando essas
> fases começarem. Ver `docs/roadmap.md` para a ordem completa.

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

## Relacionamentos-chave (Fase 0/1)

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
