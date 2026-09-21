-- Espiritual > Orações. Ver docs/database.md > Fase 3 > prayers.
--
-- "Transformar um pedido em oração respondida mantendo histórico" é uma
-- transição de status no mesmo registro (não um novo registro) — o
-- histórico é preservado via requested_at/answered_at/updated_at, não por
-- imutabilidade da linha (diferente de weight_logs).

create table public.prayers (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  type text not null check (type in ('pedido', 'agradecimento', 'respondida')),
  description text not null,
  requested_at date not null,
  answered_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'respondida' or answered_at is not null)
);

create index prayers_user_id_type_idx on public.prayers (user_id, type);

create trigger prayers_set_updated_at
before update on public.prayers
for each row
execute function public.set_updated_at();

alter table public.prayers enable row level security;

create policy prayers_select_own
  on public.prayers for select using (auth.uid () = user_id);

create policy prayers_insert_own
  on public.prayers for insert with check (auth.uid () = user_id);

create policy prayers_update_own
  on public.prayers for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy prayers_delete_own
  on public.prayers for delete using (auth.uid () = user_id);
