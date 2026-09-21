-- Saúde > Peso. Ver docs/database.md > Fase 2 > weight_logs/weight_goals e
-- docs/business-rules.md > Fase 2 > Peso.
--
-- CRÍTICO: cada registro de peso é uma linha própria em weight_logs. Nunca
-- sobrescrever um registro anterior — o histórico completo é sempre
-- preservado (mesma filosofia de habit_logs na Fase 1).

alter table public.profiles
  add column height_cm numeric check (height_cm is null or (height_cm > 0 and height_cm < 300));

comment on column public.profiles.height_cm is
  'Altura em cm, usada como valor padrão sugerido na calculadora de IMC.';

create table public.weight_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  weight_kg numeric not null check (weight_kg > 0 and weight_kg < 500),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

comment on column public.weight_logs.date is
  'Data local do usuário. Múltiplos registros no mesmo dia são permitidos — nunca sobrescrever.';

create index weight_logs_user_id_date_idx on public.weight_logs (user_id, date);

alter table public.weight_logs enable row level security;

create policy weight_logs_select_own
  on public.weight_logs for select using (auth.uid () = user_id);

create policy weight_logs_insert_own
  on public.weight_logs for insert with check (auth.uid () = user_id);

create policy weight_logs_delete_own
  on public.weight_logs for delete using (auth.uid () = user_id);

-- Sem policy de UPDATE: um registro de peso é imutável uma vez salvo (só é
-- possível apagar e criar um novo), reforçando "nunca sobrescrever".

create table public.weight_goals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  target_weight_kg numeric not null check (target_weight_kg > 0 and target_weight_kg < 500),
  target_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só existe uma meta ativa por vez por usuário — trocar de meta desativa a
-- anterior (ver função set_weight_goal), nunca deixando duas ativas.
create unique index weight_goals_one_active_per_user
  on public.weight_goals (user_id)
  where (is_active);

create trigger weight_goals_set_updated_at
before update on public.weight_goals
for each row
execute function public.set_updated_at();

alter table public.weight_goals enable row level security;

create policy weight_goals_select_own
  on public.weight_goals for select using (auth.uid () = user_id);

create policy weight_goals_insert_own
  on public.weight_goals for insert with check (auth.uid () = user_id);

create policy weight_goals_update_own
  on public.weight_goals for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy weight_goals_delete_own
  on public.weight_goals for delete using (auth.uid () = user_id);
