-- Versão mínima de metas necessária para o Planejamento Semanal da Fase 1.
-- Tipos completos (mensal/trimestral/anual com vínculos a treino, vendas
-- etc.) evoluem nas fases seguintes. Ver docs/database.md > Fase 1 > goals.

create table public.goals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null
    check (type in ('semanal', 'mensal', 'trimestral', 'anual', 'personalizada')),
  kind text not null check (kind in ('resultado', 'processo')),
  period_start date not null,
  period_end date not null,
  target_value numeric,
  current_value numeric,
  life_area_id uuid references public.life_areas (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index goals_user_id_idx on public.goals (user_id);

create trigger goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy goals_select_own
  on public.goals
  for select
  using (auth.uid () = user_id);

create policy goals_insert_own
  on public.goals
  for insert
  with check (auth.uid () = user_id);

create policy goals_update_own
  on public.goals
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy goals_delete_own
  on public.goals
  for delete
  using (auth.uid () = user_id);
