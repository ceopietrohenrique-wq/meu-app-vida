-- Negócios > Contexto empresarial mínimo. Ver docs/database.md > Fase 5.
--
-- "Central empresarial" genérica (CLAUDE.md > Fase 5 > 1): um usuário pode
-- ter mais de um negócio (ex.: plaquinhas + sites + serviços digitais) —
-- nunca codificado para um tipo específico. Cada entidade de Negócios
-- (cliente, catálogo, venda, estoque) referencia business_id, nullable,
-- para não forçar a escolha de um negócio em contas simples com um só.

create table public.businesses (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  segment text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_user_id_idx on public.businesses (user_id);

create trigger businesses_set_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();

alter table public.businesses enable row level security;

create policy businesses_select_own
  on public.businesses for select using (auth.uid () = user_id);

create policy businesses_insert_own
  on public.businesses for insert with check (auth.uid () = user_id);

create policy businesses_update_own
  on public.businesses for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy businesses_delete_own
  on public.businesses for delete using (auth.uid () = user_id);

-- A Fase 4 já reservou finance_transactions.business_id/sale_id como uuid
-- solto (mesma lógica de tasks.project_id) para não exigir migration
-- destrutiva depois. Agora que businesses existe, a FK entra de verdade.
alter table public.finance_transactions
  add constraint finance_transactions_business_id_fkey
  foreign key (business_id) references public.businesses (id) on delete set null;
