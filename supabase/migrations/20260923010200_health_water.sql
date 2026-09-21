-- Saúde > Água. Ver docs/database.md > Fase 2 > water_settings/water_logs.

create table public.water_settings (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid (),
  daily_goal_ml integer not null default 2000 check (daily_goal_ml > 0 and daily_goal_ml <= 10000),
  updated_at timestamptz not null default now()
);

create trigger water_settings_set_updated_at
before update on public.water_settings
for each row
execute function public.set_updated_at();

alter table public.water_settings enable row level security;

create policy water_settings_select_own
  on public.water_settings for select using (auth.uid () = user_id);

create policy water_settings_insert_own
  on public.water_settings for insert with check (auth.uid () = user_id);

create policy water_settings_update_own
  on public.water_settings for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

-- water_logs é um log por evento (cada "+250ml" é uma linha), nunca um único
-- contador mutável — permite desfazer/auditar e é a base do cálculo do
-- total do dia.
create table public.water_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  date date not null,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 5000),
  created_at timestamptz not null default now()
);

create index water_logs_user_id_date_idx on public.water_logs (user_id, date);

alter table public.water_logs enable row level security;

create policy water_logs_select_own
  on public.water_logs for select using (auth.uid () = user_id);

create policy water_logs_insert_own
  on public.water_logs for insert with check (auth.uid () = user_id);

create policy water_logs_delete_own
  on public.water_logs for delete using (auth.uid () = user_id);
