-- Espiritual > Estudo Bíblico. Ver docs/database.md > Fase 3 >
-- bible_study_notes. tags/cross_references como text[] para permitir busca
-- por tag (índice GIN) sem precisar de tabela de junção — volume esperado
-- por usuário é baixo o suficiente para não justificar normalizar mais.

create table public.bible_study_notes (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  book text not null,
  chapter smallint not null check (chapter > 0),
  verse_start smallint check (verse_start is null or verse_start > 0),
  verse_end smallint check (verse_end is null or verse_end >= verse_start),
  title text not null,
  personal_interpretation text,
  context text,
  questions text,
  application text,
  cross_references text[],
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bible_study_notes_user_id_idx on public.bible_study_notes (user_id);
create index bible_study_notes_book_chapter_idx
  on public.bible_study_notes (user_id, book, chapter);
create index bible_study_notes_tags_idx on public.bible_study_notes using gin (tags);

create trigger bible_study_notes_set_updated_at
before update on public.bible_study_notes
for each row
execute function public.set_updated_at();

alter table public.bible_study_notes enable row level security;

create policy bible_study_notes_select_own
  on public.bible_study_notes for select using (auth.uid () = user_id);

create policy bible_study_notes_insert_own
  on public.bible_study_notes for insert with check (auth.uid () = user_id);

create policy bible_study_notes_update_own
  on public.bible_study_notes for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy bible_study_notes_delete_own
  on public.bible_study_notes for delete using (auth.uid () = user_id);
