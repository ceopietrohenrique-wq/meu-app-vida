-- Tarefas e recorrências. Ver docs/database.md > Fase 1 > tasks e
-- task_recurrences, e docs/business-rules.md > 4. Tarefas recorrentes.

create table public.task_recurrences (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  frequency text not null
    check (frequency in ('diaria', 'semanal', 'mensal', 'dias_da_semana')),
  days_of_week smallint[],
  "interval" integer not null default 1 check ("interval" > 0),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

alter table public.task_recurrences enable row level security;

create policy task_recurrences_select_own
  on public.task_recurrences
  for select
  using (auth.uid () = user_id);

create policy task_recurrences_insert_own
  on public.task_recurrences
  for insert
  with check (auth.uid () = user_id);

create policy task_recurrences_update_own
  on public.task_recurrences
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy task_recurrences_delete_own
  on public.task_recurrences
  for delete
  using (auth.uid () = user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  due_date date,
  due_time time,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  life_area_id uuid references public.life_areas (id) on delete set null,
  -- `projects` só existe a partir da fase em que o domínio for implementado;
  -- a coluna já nasce aqui para não exigir migration destrutiva depois, mas
  -- sem FK até a tabela existir (ver docs/database.md > Notas de simplificação).
  project_id uuid,
  goal_id uuid references public.goals (id) on delete set null,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  recurrence_id uuid references public.task_recurrences (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on column public.tasks.project_id is
  'Sem FK ainda: tabela projects chega em fase futura. Não usar para joins até lá.';

create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_user_id_due_date_idx on public.tasks (user_id, due_date);

-- Nunca duplicar a mesma ocorrência de uma recorrência no mesmo dia, mesmo
-- que o processo de geração rode mais de uma vez.
create unique index tasks_recurrence_due_date_unique
  on public.tasks (recurrence_id, due_date)
  where recurrence_id is not null;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy tasks_select_own
  on public.tasks
  for select
  using (auth.uid () = user_id);

create policy tasks_insert_own
  on public.tasks
  for insert
  with check (auth.uid () = user_id);

create policy tasks_update_own
  on public.tasks
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy tasks_delete_own
  on public.tasks
  for delete
  using (auth.uid () = user_id);
