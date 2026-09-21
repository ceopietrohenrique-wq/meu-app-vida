-- Saúde > Alimentação. Ver docs/database.md > Fase 2 > meal_plans/meal_logs.
--
-- Prioridade é adesão, não um sistema completo de contagem calórica — por
-- isso calorias/macros são sempre nullable (CLAUDE.md > Fase 2 > 5).

create table public.meal_plans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  time time,
  items text,
  calories numeric check (calories is null or calories >= 0),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbs_g numeric check (carbs_g is null or carbs_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  notes text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_plans_user_id_idx on public.meal_plans (user_id);

create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row
execute function public.set_updated_at();

alter table public.meal_plans enable row level security;

create policy meal_plans_select_own
  on public.meal_plans for select using (auth.uid () = user_id);

create policy meal_plans_insert_own
  on public.meal_plans for insert with check (auth.uid () = user_id);

create policy meal_plans_update_own
  on public.meal_plans for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy meal_plans_delete_own
  on public.meal_plans for delete using (auth.uid () = user_id);

-- Um status por refeição planejada por dia — mesma filosofia de idempotência
-- de habit_logs: UNIQUE(meal_plan_id, date) é a base para o upsert e para a
-- idempotência do XP de adesão alimentar.
create table public.meal_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  date date not null,
  status text not null check (status in ('realizada', 'parcial', 'nao_realizada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_plan_id, date)
);

create index meal_logs_user_id_date_idx on public.meal_logs (user_id, date);

create trigger meal_logs_set_updated_at
before update on public.meal_logs
for each row
execute function public.set_updated_at();

alter table public.meal_logs enable row level security;

create policy meal_logs_select_own
  on public.meal_logs for select using (auth.uid () = user_id);

create policy meal_logs_insert_own
  on public.meal_logs for insert with check (auth.uid () = user_id);

create policy meal_logs_update_own
  on public.meal_logs for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy meal_logs_delete_own
  on public.meal_logs for delete using (auth.uid () = user_id);
