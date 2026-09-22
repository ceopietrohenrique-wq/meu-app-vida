-- Negócios > Estoque. Ver docs/database.md > Fase 5.
--
-- Estoque atual NUNCA é uma coluna mutável — é sempre a soma de
-- inventory_movements (mesma filosofia de saldo de conta na Fase 4 e
-- streak de hábito na Fase 1): nenhuma coluna denormalizada para
-- dessincronizar. `inventory_settings` guarda só a configuração
-- (estoque mínimo), não o nível atual.

create table public.inventory_settings (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  catalog_item_id uuid not null references public.catalog_items (id) on delete cascade,
  minimum_quantity integer check (minimum_quantity is null or minimum_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_item_id)
);

create trigger inventory_settings_set_updated_at
before update on public.inventory_settings
for each row
execute function public.set_updated_at();

create function public.inventory_settings_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.catalog_items
    where id = new.catalog_item_id and user_id = new.user_id and tracks_inventory
  ) then
    raise exception 'Item de catálogo inválido ou não controla estoque.';
  end if;

  return new;
end;
$$;

create trigger inventory_settings_validate_ownership
before insert or update on public.inventory_settings
for each row
execute function public.inventory_settings_validate_ownership();

alter table public.inventory_settings enable row level security;

create policy inventory_settings_select_own
  on public.inventory_settings for select using (auth.uid () = user_id);

create policy inventory_settings_insert_own
  on public.inventory_settings for insert with check (auth.uid () = user_id);

create policy inventory_settings_update_own
  on public.inventory_settings for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy inventory_settings_delete_own
  on public.inventory_settings for delete using (auth.uid () = user_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  catalog_item_id uuid not null references public.catalog_items (id) on delete restrict,
  type text not null check (type in ('entrada', 'saida', 'ajuste', 'venda', 'estorno')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference_sale_id uuid references public.sales (id) on delete set null,
  notes text,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  -- venda/estorno sempre vêm de finalize/update_sale_status (têm
  -- reference_sale_id); entrada/saída/ajuste são sempre manuais.
  check ((type in ('venda', 'estorno')) = (reference_sale_id is not null))
);

create index inventory_movements_catalog_item_id_idx
  on public.inventory_movements (catalog_item_id);
create index inventory_movements_user_id_idx on public.inventory_movements (user_id);

create unique index inventory_movements_client_request_id_unique
  on public.inventory_movements (user_id, client_request_id)
  where client_request_id is not null;

create function public.inventory_movements_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.catalog_items
    where id = new.catalog_item_id and user_id = new.user_id and tracks_inventory
  ) then
    raise exception 'Item de catálogo inválido ou não controla estoque.';
  end if;

  if new.reference_sale_id is not null and not exists (
    select 1 from public.sales where id = new.reference_sale_id and user_id = new.user_id
  ) then
    raise exception 'Venda inválida para este usuário.';
  end if;

  return new;
end;
$$;

create trigger inventory_movements_validate_ownership
before insert on public.inventory_movements
for each row
execute function public.inventory_movements_validate_ownership();

alter table public.inventory_movements enable row level security;

create policy inventory_movements_select_own
  on public.inventory_movements for select using (auth.uid () = user_id);

create policy inventory_movements_insert_own
  on public.inventory_movements for insert with check (auth.uid () = user_id);

-- Sem UPDATE/DELETE: movimentação de estoque é histórico imutável — uma
-- correção é um novo movimento tipo 'ajuste', nunca editar um antigo.

create function public.get_inventory_levels()
returns table (
  catalog_item_id uuid,
  quantity_on_hand integer,
  minimum_quantity integer
)
language plpgsql
stable
as $$
begin
  return query
  select
    ci.id,
    coalesce(sum(im.quantity_delta), 0)::integer,
    s.minimum_quantity
  from public.catalog_items ci
  left join public.inventory_movements im on im.catalog_item_id = ci.id
  left join public.inventory_settings s on s.catalog_item_id = ci.id
  where ci.user_id = auth.uid () and ci.tracks_inventory
  group by ci.id, s.minimum_quantity;
end;
$$;

revoke all on function public.get_inventory_levels () from public;
grant execute on function public.get_inventory_levels () to authenticated;
