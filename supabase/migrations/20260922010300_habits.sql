-- Hábitos e execuções. Ver docs/database.md > Fase 1 > habits/habit_logs e
-- docs/business-rules.md > 3. Streaks de hábito.
--
-- CRÍTICO: cada execução é uma linha em habit_logs. Nunca usar apenas um
-- boolean `completed` no hábito — isso destruiria o histórico.

create table public.habits (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  frequency text not null
    check (frequency in ('diaria', 'dias_da_semana')),
  days_of_week smallint[],
  target_time time,
  category text,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (frequency = 'dias_da_semana' and days_of_week is not null and array_length(days_of_week, 1) > 0)
    or (frequency = 'diaria')
  )
);

create index habits_user_id_idx on public.habits (user_id);

create trigger habits_set_updated_at
before update on public.habits
for each row
execute function public.set_updated_at();

alter table public.habits enable row level security;

create policy habits_select_own
  on public.habits
  for select
  using (auth.uid () = user_id);

create policy habits_insert_own
  on public.habits
  for insert
  with check (auth.uid () = user_id);

create policy habits_update_own
  on public.habits
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy habits_delete_own
  on public.habits
  for delete
  using (auth.uid () = user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  value numeric,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

comment on column public.habit_logs.date is
  'Data local do usuário (profiles.timezone), nunca a data UTC do servidor.';

create index habit_logs_user_id_date_idx on public.habit_logs (user_id, date);

alter table public.habit_logs enable row level security;

create policy habit_logs_select_own
  on public.habit_logs
  for select
  using (auth.uid () = user_id);

create policy habit_logs_insert_own
  on public.habit_logs
  for insert
  with check (auth.uid () = user_id);

create policy habit_logs_delete_own
  on public.habit_logs
  for delete
  using (auth.uid () = user_id);

-- Sem policy de UPDATE: um log é substituído por delete + insert (desmarcar
-- e marcar de novo), nunca editado in-place — mantém o histórico simples e
-- auditável.
