-- Negócios > Catálogo genérico. Ver docs/database.md > Fase 5.
--
-- Item pode ser produto físico ou serviço (`type`) — nunca modelado
-- exclusivamente para um tipo de negócio (CLAUDE.md > Fase 5 > 1/4).
-- Preço/custo padrão são só o PADRÃO: o valor real de cada venda é sempre
-- um snapshot em sale_items (ver 20260927010400), nunca lido do catálogo
-- no momento da venda.

create table public.catalog_items (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  business_id uuid references public.businesses (id) on delete set null,
  name text not null,
  type text not null check (type in ('produto', 'servico')),
  description text,
  default_price numeric not null check (default_price >= 0),
  default_cost numeric not null default 0 check (default_cost >= 0),
  is_active boolean not null default true,
  sku text,
  -- Só produtos fazem sentido controlar estoque — serviço nunca baixa
  -- estoque (check abaixo).
  tracks_inventory boolean not null default false,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type = 'produto' or tracks_inventory = false)
);

create index catalog_items_user_id_idx on public.catalog_items (user_id);
create index catalog_items_user_id_active_idx on public.catalog_items (user_id, is_active);

create function public.catalog_items_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.businesses
    where id = new.business_id and user_id = new.user_id
  ) then
    raise exception 'Negócio inválido para este usuário.';
  end if;

  return new;
end;
$$;

create trigger catalog_items_validate_ownership
before insert or update on public.catalog_items
for each row
execute function public.catalog_items_validate_ownership();

create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row
execute function public.set_updated_at();

alter table public.catalog_items enable row level security;

create policy catalog_items_select_own
  on public.catalog_items for select using (auth.uid () = user_id);

create policy catalog_items_insert_own
  on public.catalog_items for insert with check (auth.uid () = user_id);

create policy catalog_items_update_own
  on public.catalog_items for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy catalog_items_delete_own
  on public.catalog_items for delete using (auth.uid () = user_id);
