-- Espiritual > Devocional. Ver docs/database.md > Fase 3 > devotionals e
-- docs/business-rules.md > Fase 3 > Devocional.
--
-- Um registro por dia (UNIQUE(user_id, date)) — diferente de weight_logs,
-- aqui FAZ sentido permitir editar o mesmo dia ao longo do dia (voltar e
-- completar a reflexão depois da oração, por exemplo), por isso existe
-- policy de UPDATE.

create table public.devotionals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  date date not null,
  passage text,
  theme text,
  reflection text,
  learning text,
  application text,
  prayer text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  notes text,
  read_done boolean not null default false,
  reflection_done boolean not null default false,
  prayer_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

comment on column public.devotionals.date is
  'Data local do usuário. Um devocional por dia — reenviar o mesmo dia atualiza o registro (upsert), nunca cria um segundo.';

create index devotionals_user_id_date_idx on public.devotionals (user_id, date);

create trigger devotionals_set_updated_at
before update on public.devotionals
for each row
execute function public.set_updated_at();

alter table public.devotionals enable row level security;

create policy devotionals_select_own
  on public.devotionals for select using (auth.uid () = user_id);

create policy devotionals_insert_own
  on public.devotionals for insert with check (auth.uid () = user_id);

create policy devotionals_update_own
  on public.devotionals for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy devotionals_delete_own
  on public.devotionals for delete using (auth.uid () = user_id);
