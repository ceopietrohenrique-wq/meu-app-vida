-- Negócios > Vendas e itens da venda (snapshot). Ver docs/database.md >
-- Fase 5 e docs/business-rules.md > Fase 5.
--
-- sale_items é SEMPRE um snapshot no momento da venda (nome, tipo, preço,
-- custo, desconto) — nunca uma referência "lida ao vivo" do catálogo
-- (CLAUDE.md > Fase 5 > 7). Mudar o preço futuro de um catalog_item NUNCA
-- altera uma venda antiga, porque a venda não lê catalog_items depois de
-- criada.
--
-- gross_amount/discount_amount/net_amount/direct_costs em `sales` são
-- sempre calculados a partir de sale_items pela RPC create_sale (ver
-- 20260927011000) — nunca digitados livremente pelo usuário, para nunca
-- divergir da soma real dos itens.

create table public.sales (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  business_id uuid references public.businesses (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  -- Conta de destino do dinheiro, se/quando a venda virar 'paid'. Nullable:
  -- o reflexo financeiro automático é opt-in por venda (CLAUDE.md > Fase 5 > 9,
  -- "quando aplicável").
  account_id uuid references public.finance_accounts (id) on delete set null,
  status text not null default 'draft' check (
    status in ('draft', 'negotiating', 'confirmed', 'paid', 'delivered', 'cancelled', 'refunded')
  ),
  gross_amount numeric not null default 0 check (gross_amount >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0 and discount_amount <= gross_amount),
  net_amount numeric not null default 0 check (net_amount >= 0),
  direct_costs numeric not null default 0 check (direct_costs >= 0),
  fees numeric not null default 0 check (fees >= 0),
  payment_method text,
  sale_date date not null,
  responsible text,
  notes text,
  client_request_id uuid,
  -- Guards de idempotência dos efeitos colaterais de update_sale_status
  -- (20260927011100) — nunca dependem só do client_request_id daquela
  -- chamada, porque a mesma baixa de estoque não pode acontecer duas vezes
  -- mesmo se chamada com chaves de idempotência diferentes.
  stock_deducted_at timestamptz,
  stock_reverted_at timestamptz,
  revenue_transaction_id uuid references public.finance_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_user_id_date_idx on public.sales (user_id, sale_date);
create index sales_user_id_status_idx on public.sales (user_id, status);
create index sales_user_id_customer_id_idx on public.sales (user_id, customer_id);

create unique index sales_client_request_id_unique
  on public.sales (user_id, client_request_id)
  where client_request_id is not null;

create trigger sales_set_updated_at
before update on public.sales
for each row
execute function public.set_updated_at();

create function public.sales_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.businesses where id = new.business_id and user_id = new.user_id
  ) then
    raise exception 'Negócio inválido para este usuário.';
  end if;

  if new.customer_id is not null and not exists (
    select 1 from public.customers where id = new.customer_id and user_id = new.user_id
  ) then
    raise exception 'Cliente inválido para este usuário.';
  end if;

  if new.account_id is not null and not exists (
    select 1 from public.finance_accounts where id = new.account_id and user_id = new.user_id
  ) then
    raise exception 'Conta inválida para este usuário.';
  end if;

  return new;
end;
$$;

create trigger sales_validate_ownership
before insert or update on public.sales
for each row
execute function public.sales_validate_ownership();

-- Preserva o histórico financeiro: uma venda não-draft/negotiating (já
-- confirmada, paga, entregue, cancelada ou reembolsada) não pode ser
-- apagada — só cancelar/reembolsar via status.
create function public.sales_prevent_delete_committed()
returns trigger
language plpgsql
as $$
begin
  if old.status not in ('draft', 'negotiating') then
    raise exception 'Não é possível excluir uma venda com status %. Cancele ou reembolse via mudança de status.', old.status;
  end if;

  return old;
end;
$$;

create trigger sales_prevent_delete_committed
before delete on public.sales
for each row
execute function public.sales_prevent_delete_committed();

alter table public.sales enable row level security;

create policy sales_select_own
  on public.sales for select using (auth.uid () = user_id);

create policy sales_insert_own
  on public.sales for insert with check (auth.uid () = user_id);

create policy sales_update_own
  on public.sales for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy sales_delete_own
  on public.sales for delete using (auth.uid () = user_id);

create table public.sale_items (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  sale_id uuid not null references public.sales (id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items (id) on delete restrict,
  item_name text not null,
  item_type text not null check (item_type in ('produto', 'servico')),
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  tracks_inventory boolean not null default false,
  total numeric not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_user_id_catalog_item_id_idx on public.sale_items (user_id, catalog_item_id);

create function public.sale_items_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.sales where id = new.sale_id and user_id = new.user_id
  ) then
    raise exception 'Venda inválida para este usuário.';
  end if;

  if not exists (
    select 1 from public.catalog_items where id = new.catalog_item_id and user_id = new.user_id
  ) then
    raise exception 'Item de catálogo inválido para este usuário.';
  end if;

  return new;
end;
$$;

create trigger sale_items_validate_ownership
before insert on public.sale_items
for each row
execute function public.sale_items_validate_ownership();

alter table public.sale_items enable row level security;

create policy sale_items_select_own
  on public.sale_items for select using (auth.uid () = user_id);

create policy sale_items_insert_own
  on public.sale_items for insert with check (auth.uid () = user_id);

-- Sem policy de UPDATE/DELETE: sale_items é um snapshot imutável — corrigir
-- uma venda em draft/negotiating é excluir a venda inteira (cascade) e
-- recriar, nunca editar um item isolado.
