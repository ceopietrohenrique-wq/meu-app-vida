-- Espiritual > Busca por palavra. Ver docs/business-rules.md > 18.
--
-- Coluna tsvector mantida por trigger (não coluna gerada — a expressão
-- to_tsvector com config seria classificada como não-imutável pelo
-- Postgres mesmo com cast para regconfig neste ambiente, então o trigger é
-- a forma padrão e suportada de manter a coluna atualizada) + índice GIN,
-- para permitir busca textual segura e performática no título,
-- interpretação pessoal, contexto, dúvidas, aplicação e livro — sem montar
-- SQL dinâmico no client. O client usa `.textSearch()` do supabase-js
-- (operador `fts` do PostgREST), que passa a palavra buscada como
-- parâmetro, nunca concatenação de string.

alter table public.bible_study_notes add column search_vector tsvector;

create trigger bible_study_notes_search_vector_update
before insert or update on public.bible_study_notes
for each row
execute function tsvector_update_trigger(
  search_vector, 'pg_catalog.portuguese',
  title, personal_interpretation, context, questions, application, book
);

update public.bible_study_notes set search_vector = to_tsvector(
  'portuguese',
  coalesce(title, '') || ' ' ||
  coalesce(personal_interpretation, '') || ' ' ||
  coalesce(context, '') || ' ' ||
  coalesce(questions, '') || ' ' ||
  coalesce(application, '') || ' ' ||
  coalesce(book, '')
);

create index bible_study_notes_search_vector_idx
  on public.bible_study_notes using gin (search_vector);

alter table public.saved_verses add column search_vector tsvector;

create trigger saved_verses_search_vector_update
before insert or update on public.saved_verses
for each row
execute function tsvector_update_trigger(
  search_vector, 'pg_catalog.portuguese',
  reference, notes, book
);

update public.saved_verses set search_vector = to_tsvector(
  'portuguese',
  coalesce(reference, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(book, '')
);

create index saved_verses_search_vector_idx
  on public.saved_verses using gin (search_vector);
