-- Inbox Universal: captura rápida sem decidir organização no momento.
-- Ver docs/database.md > inbox_items.

create table public.inbox_items (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  source_type text not null default 'texto'
    check (
      source_type in (
        'texto', 'ideia', 'tarefa', 'link', 'nota', 'lembrete'
      )
    ),
  status text not null default 'inbox'
    check (status in ('inbox', 'processado', 'arquivado')),
  converted_to_type text check (converted_to_type in ('task', 'idea', 'note')),
  converted_to_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbox_items_user_id_status_idx on public.inbox_items (user_id, status);

create trigger inbox_items_set_updated_at
before update on public.inbox_items
for each row
execute function public.set_updated_at();

alter table public.inbox_items enable row level security;

create policy inbox_items_select_own
  on public.inbox_items
  for select
  using (auth.uid () = user_id);

create policy inbox_items_insert_own
  on public.inbox_items
  for insert
  with check (auth.uid () = user_id);

create policy inbox_items_update_own
  on public.inbox_items
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy inbox_items_delete_own
  on public.inbox_items
  for delete
  using (auth.uid () = user_id);
