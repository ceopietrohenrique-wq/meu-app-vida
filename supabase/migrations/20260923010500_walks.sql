-- Saúde > Caminhada. Registro simples e opcional (duração + distância
-- opcional) só para sustentar o comportamento "caminhada" da lista de XP de
-- saúde do CLAUDE.md — não é um domínio de treino cardio completo.

create table public.walk_logs (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  date date not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 600),
  distance_km numeric check (distance_km is null or (distance_km > 0 and distance_km < 200)),
  notes text,
  created_at timestamptz not null default now()
);

create index walk_logs_user_id_date_idx on public.walk_logs (user_id, date);

alter table public.walk_logs enable row level security;

create policy walk_logs_select_own
  on public.walk_logs for select using (auth.uid () = user_id);

create policy walk_logs_insert_own
  on public.walk_logs for insert with check (auth.uid () = user_id);

create policy walk_logs_delete_own
  on public.walk_logs for delete using (auth.uid () = user_id);
