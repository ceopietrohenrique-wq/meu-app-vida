-- Espiritual > Versículos salvos. Ver docs/database.md > Fase 3 >
-- saved_verses. Sem integração externa nesta fase — `text` é sempre a
-- nota/texto que o próprio usuário digitou, nunca buscado de uma API.

create table public.saved_verses (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  reference text not null,
  book text not null,
  chapter smallint not null check (chapter > 0),
  verse_start smallint not null check (verse_start > 0),
  verse_end smallint check (verse_end is null or verse_end >= verse_start),
  notes text,
  tags text[],
  created_at timestamptz not null default now()
);

create index saved_verses_user_id_idx on public.saved_verses (user_id);
create index saved_verses_book_chapter_idx
  on public.saved_verses (user_id, book, chapter);
create index saved_verses_tags_idx on public.saved_verses using gin (tags);

alter table public.saved_verses enable row level security;

create policy saved_verses_select_own
  on public.saved_verses for select using (auth.uid () = user_id);

create policy saved_verses_insert_own
  on public.saved_verses for insert with check (auth.uid () = user_id);

create policy saved_verses_update_own
  on public.saved_verses for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy saved_verses_delete_own
  on public.saved_verses for delete using (auth.uid () = user_id);
