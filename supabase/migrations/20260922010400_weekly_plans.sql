-- Planejamento semanal (escopo Fase 1). Ver docs/database.md > weekly_plans.

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  top_priorities text[] not null default '{}',
  planned_workouts integer check (planned_workouts is null or planned_workouts >= 0),
  weekly_xp_goal integer check (weekly_xp_goal is null or weekly_xp_goal >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (array_length(top_priorities, 1) is null or array_length(top_priorities, 1) <= 3)
);

create trigger weekly_plans_set_updated_at
before update on public.weekly_plans
for each row
execute function public.set_updated_at();

alter table public.weekly_plans enable row level security;

create policy weekly_plans_select_own
  on public.weekly_plans
  for select
  using (auth.uid () = user_id);

create policy weekly_plans_insert_own
  on public.weekly_plans
  for insert
  with check (auth.uid () = user_id);

create policy weekly_plans_update_own
  on public.weekly_plans
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy weekly_plans_delete_own
  on public.weekly_plans
  for delete
  using (auth.uid () = user_id);
