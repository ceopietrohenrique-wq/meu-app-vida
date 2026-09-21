-- Espiritual > Plano de leitura. Ver docs/database.md > Fase 3 >
-- reading_plans/reading_plan_logs.
--
-- `source`/`template_key` deixam a estrutura pronta para planos
-- predefinidos no futuro (catálogo de templates) sem precisar de migration
-- nova — mas nenhuma tabela de catálogo é criada agora, porque nenhum plano
-- predefinido existe ainda (CLAUDE.md > não criar tabela só para copiar a
-- spec; ver decisão em docs/architecture.md).

create table public.reading_plans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  start_date date not null,
  total_days integer not null check (total_days > 0),
  source text not null default 'custom' check (source in ('custom', 'predefined')),
  template_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reading_plans_user_id_idx on public.reading_plans (user_id);

create trigger reading_plans_set_updated_at
before update on public.reading_plans
for each row
execute function public.set_updated_at();

alter table public.reading_plans enable row level security;

create policy reading_plans_select_own
  on public.reading_plans for select using (auth.uid () = user_id);

create policy reading_plans_insert_own
  on public.reading_plans for insert with check (auth.uid () = user_id);

create policy reading_plans_update_own
  on public.reading_plans for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy reading_plans_delete_own
  on public.reading_plans for delete using (auth.uid () = user_id);

-- Uma conclusão por dia do plano — UNIQUE(reading_plan_id, day_number) é a
-- garantia de "nunca duplicar conclusão do mesmo dia" (mesmo padrão de
-- habit_logs/meal_logs).
create table public.reading_plan_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  reading_plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (reading_plan_id, day_number)
);

create index reading_plan_logs_user_id_plan_idx
  on public.reading_plan_logs (user_id, reading_plan_id);

alter table public.reading_plan_logs enable row level security;

create policy reading_plan_logs_select_own
  on public.reading_plan_logs for select using (auth.uid () = user_id);

create policy reading_plan_logs_insert_own
  on public.reading_plan_logs for insert with check (auth.uid () = user_id);

create policy reading_plan_logs_delete_own
  on public.reading_plan_logs for delete using (auth.uid () = user_id);
