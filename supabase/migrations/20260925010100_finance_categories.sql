-- Financeiro > Categorias. Ver docs/database.md > Fase 4 > finance_categories.
--
-- UNIQUE(user_id, context, name) evita duplicação desnecessária (CLAUDE.md >
-- Fase 4 > 5) sem impedir o mesmo nome em contextos diferentes (ex.:
-- "Ferramentas" pessoal e "Ferramentas" empresarial são categorias distintas).

create table public.finance_categories (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  context text not null check (context in ('pessoal', 'empresarial')),
  created_at timestamptz not null default now(),
  unique (user_id, context, name)
);

create index finance_categories_user_id_idx on public.finance_categories (user_id);

alter table public.finance_categories enable row level security;

create policy finance_categories_select_own
  on public.finance_categories for select using (auth.uid () = user_id);

create policy finance_categories_insert_own
  on public.finance_categories for insert with check (auth.uid () = user_id);

create policy finance_categories_update_own
  on public.finance_categories for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy finance_categories_delete_own
  on public.finance_categories for delete using (auth.uid () = user_id);
