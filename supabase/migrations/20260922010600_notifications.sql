-- Notificações in-app básicas da Fase 1. PUSH fica para a Fase 7.
-- Ver docs/database.md > notifications.

create table public.notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  notification_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.notifications.notification_key is
  'Chave de deduplicação (ex.: XP_WEEKLY_GOAL:2026-09-21). Nula para notificações que não precisam de dedup.';

create unique index notifications_user_id_notification_key_unique
  on public.notifications (user_id, notification_key)
  where notification_key is not null;

create index notifications_user_id_read_at_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications
  for select
  using (auth.uid () = user_id);

create policy notifications_insert_own
  on public.notifications
  for insert
  with check (auth.uid () = user_id);

-- Único campo que o usuário deve conseguir alterar é a leitura (read_at).
create policy notifications_update_own
  on public.notifications
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy notifications_delete_own
  on public.notifications
  for delete
  using (auth.uid () = user_id);
