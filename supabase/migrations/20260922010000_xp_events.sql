-- Tabela central de gamificação. Ver docs/business-rules.md > 1. XP.
-- A idempotência de XP é garantida por esta constraint UNIQUE, nunca pelo
-- frontend.

create table public.xp_events (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  xp_amount integer not null check (xp_amount > 0),
  source_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_key)
);

comment on table public.xp_events is
  'Eventos imutáveis de XP. O total de XP é sempre a soma desta tabela — nunca um contador mutável.';
comment on column public.xp_events.xp_amount is
  'Sempre positivo: o produto nunca penaliza com XP negativo.';

create index xp_events_user_id_created_at_idx
  on public.xp_events (user_id, created_at);

alter table public.xp_events enable row level security;

create policy xp_events_select_own
  on public.xp_events
  for select
  using (auth.uid () = user_id);

create policy xp_events_insert_own
  on public.xp_events
  for insert
  with check (auth.uid () = user_id);

-- Eventos de XP são imutáveis por design: sem policy de UPDATE/DELETE, então
-- nenhum usuário (nem o dono) pode alterar ou apagar um evento já concedido.
