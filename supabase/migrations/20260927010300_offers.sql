-- Negócios > Kits/Ofertas. Ver docs/database.md > Fase 5.
--
-- `offers`/`offer_items` são só o TEMPLATE (preço/composição sugeridos).
-- "Customizar oferta para um cliente sem alterar o template global"
-- (CLAUDE.md > Fase 5 > 5) é resolvido pelo mesmo mecanismo de snapshot de
-- sale_items — vender uma oferta grava cada item em sale_items com o preço
-- daquela venda especificamente, o template em `offers`/`offer_items` nunca
-- é escrito no momento da venda.

create table public.offers (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  business_id uuid references public.businesses (id) on delete set null,
  name text not null,
  description text,
  discount_type text check (discount_type in ('percent', 'fixed')),
  discount_value numeric check (discount_value is null or discount_value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (discount_type is null and discount_value is null)
    or (discount_type is not null and discount_value is not null)
  ),
  check (discount_type <> 'percent' or discount_value <= 100)
);

create index offers_user_id_idx on public.offers (user_id);

create function public.offers_validate_ownership()
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

create trigger offers_validate_ownership
before insert or update on public.offers
for each row
execute function public.offers_validate_ownership();

create trigger offers_set_updated_at
before update on public.offers
for each row
execute function public.set_updated_at();

alter table public.offers enable row level security;

create policy offers_select_own
  on public.offers for select using (auth.uid () = user_id);

create policy offers_insert_own
  on public.offers for insert with check (auth.uid () = user_id);

create policy offers_update_own
  on public.offers for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy offers_delete_own
  on public.offers for delete using (auth.uid () = user_id);

create table public.offer_items (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  offer_id uuid not null references public.offers (id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  -- Preço unitário específico da oferta; null = usa catalog_items.default_price.
  unit_price_override numeric check (unit_price_override is null or unit_price_override >= 0),
  created_at timestamptz not null default now()
);

create index offer_items_offer_id_idx on public.offer_items (offer_id);

create function public.offer_items_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.offers where id = new.offer_id and user_id = new.user_id
  ) then
    raise exception 'Oferta inválida para este usuário.';
  end if;

  if not exists (
    select 1 from public.catalog_items where id = new.catalog_item_id and user_id = new.user_id
  ) then
    raise exception 'Item de catálogo inválido para este usuário.';
  end if;

  return new;
end;
$$;

create trigger offer_items_validate_ownership
before insert or update on public.offer_items
for each row
execute function public.offer_items_validate_ownership();

alter table public.offer_items enable row level security;

create policy offer_items_select_own
  on public.offer_items for select using (auth.uid () = user_id);

create policy offer_items_insert_own
  on public.offer_items for insert with check (auth.uid () = user_id);

create policy offer_items_update_own
  on public.offer_items for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy offer_items_delete_own
  on public.offer_items for delete using (auth.uid () = user_id);
