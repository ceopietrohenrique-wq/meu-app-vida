-- Corrige uma lacuna real: create_sale (20260927011000) permite nascer já
-- com status = 'confirmed'/'paid'/'delivered' (a UI oferece isso), mas só
-- update_sale_status aplicava baixa de estoque/reflexo financeiro — uma
-- venda criada direto como "confirmada" nunca baixava estoque nem validava
-- estoque suficiente. CLAUDE.md > Fase 5 > 9 exige que "finalizar venda"
-- coordene status + sale_items + estoque + reflexo financeiro sempre, não
-- só quando passa por uma transição explícita.
--
-- Extrai a lógica de efeitos colaterais (antes só dentro de
-- update_sale_status) para uma função compartilhada, chamada tanto por
-- update_sale_status quanto por create_sale quando a venda já nasce num
-- status comprometido.

create function public.apply_sale_status_effects(
  p_sale_id uuid,
  p_old_status text,
  p_new_status text
)
returns public.sales
language plpgsql
as $$
declare
  v_sale public.sales;
  v_committed_statuses constant text[] := array['confirmed', 'paid', 'delivered'];
  v_reverting_statuses constant text[] := array['cancelled', 'refunded'];
  v_item record;
  v_current_stock integer;
  v_finance_tx_id uuid;
begin
  select * into v_sale from public.sales where id = p_sale_id and user_id = auth.uid ();
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if p_old_status = p_new_status then
    return v_sale;
  end if;

  if p_new_status = any (v_committed_statuses)
     and not (p_old_status = any (v_committed_statuses))
     and v_sale.stock_deducted_at is null then
    for v_item in
      select * from public.sale_items where sale_id = p_sale_id and tracks_inventory
    loop
      select coalesce(sum(quantity_delta), 0) into v_current_stock
        from public.inventory_movements where catalog_item_id = v_item.catalog_item_id;

      if v_current_stock - v_item.quantity < 0 then
        raise exception 'Estoque insuficiente para %: disponível %, pedido %',
          v_item.item_name, v_current_stock, v_item.quantity;
      end if;

      insert into public.inventory_movements (
        user_id, catalog_item_id, type, quantity_delta, reference_sale_id, notes
      )
      values (
        auth.uid (), v_item.catalog_item_id, 'venda', -v_item.quantity, p_sale_id,
        'Baixa automática da venda'
      );
    end loop;

    update public.sales set stock_deducted_at = now() where id = p_sale_id;
  end if;

  if p_new_status = 'paid'
     and v_sale.revenue_transaction_id is null
     and v_sale.account_id is not null then
    insert into public.finance_transactions (
      user_id, account_id, type, context, amount, description,
      transaction_date, sale_id, business_id
    )
    values (
      auth.uid (), v_sale.account_id, 'income', 'empresarial', v_sale.net_amount,
      'Venda ' || p_sale_id, coalesce(v_sale.sale_date, current_date), p_sale_id, v_sale.business_id
    )
    returning id into v_finance_tx_id;

    update public.sales set revenue_transaction_id = v_finance_tx_id where id = p_sale_id;
  end if;

  if p_new_status = any (v_reverting_statuses)
     and v_sale.stock_deducted_at is not null
     and v_sale.stock_reverted_at is null then
    for v_item in
      select * from public.sale_items where sale_id = p_sale_id and tracks_inventory
    loop
      insert into public.inventory_movements (
        user_id, catalog_item_id, type, quantity_delta, reference_sale_id, notes
      )
      values (
        auth.uid (), v_item.catalog_item_id, 'estorno', v_item.quantity, p_sale_id,
        'Estorno da venda cancelada/reembolsada'
      );
    end loop;

    update public.sales set stock_reverted_at = now() where id = p_sale_id;
  end if;

  update public.sales set status = p_new_status where id = p_sale_id
    returning * into v_sale;

  return v_sale;
end;
$$;

-- update_sale_status agora delega os efeitos colaterais para a função
-- compartilhada — lock de linha (FOR UPDATE) e dedup por client_request_id
-- continuam aqui, só a aplicação dos efeitos foi extraída.
create or replace function public.update_sale_status(
  p_sale_id uuid,
  p_new_status text,
  p_client_request_id uuid default null
)
returns public.sales
language plpgsql
as $$
declare
  v_sale public.sales;
begin
  if p_new_status not in ('draft', 'negotiating', 'confirmed', 'paid', 'delivered', 'cancelled', 'refunded') then
    raise exception 'Status inválido: %', p_new_status;
  end if;

  if p_client_request_id is not null and exists (
    select 1 from public.sale_status_changes
    where user_id = auth.uid () and client_request_id = p_client_request_id
  ) then
    select * into v_sale from public.sales where id = p_sale_id and user_id = auth.uid ();
    return v_sale;
  end if;

  select * into v_sale
    from public.sales
    where id = p_sale_id and user_id = auth.uid ()
    for update;

  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if p_client_request_id is not null then
    insert into public.sale_status_changes (user_id, sale_id, from_status, to_status, client_request_id)
    values (auth.uid (), p_sale_id, v_sale.status, p_new_status, p_client_request_id);
  end if;

  return public.apply_sale_status_effects(p_sale_id, v_sale.status, p_new_status);
end;
$$;

-- create_sale agora aplica os mesmos efeitos quando a venda já nasce num
-- status comprometido (ex.: criada direto como 'confirmed' ou 'paid') — o
-- "old status" tratado como baseline é sempre 'draft' (nunca comprometido),
-- então a mesma lógica de "primeira vez entrando num status comprometido"
-- se aplica corretamente.
create or replace function public.create_sale(
  p_client_request_id uuid,
  p_items jsonb,
  p_business_id uuid default null,
  p_customer_id uuid default null,
  p_account_id uuid default null,
  p_status text default 'draft',
  p_fees numeric default 0,
  p_payment_method text default null,
  p_sale_date date default current_date,
  p_responsible text default null,
  p_notes text default null
)
returns public.sales
language plpgsql
as $$
declare
  v_sale public.sales;
  v_item jsonb;
  v_catalog public.catalog_items;
  v_quantity integer;
  v_unit_price numeric;
  v_discount numeric;
  v_gross numeric := 0;
  v_discount_total numeric := 0;
  v_direct_costs numeric := 0;
  v_item_total numeric;
  v_final_status text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Uma venda precisa de ao menos um item.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_catalog
      from public.catalog_items
      where id = (v_item ->> 'catalog_item_id')::uuid and user_id = auth.uid ();

    if not found then
      raise exception 'Item de catálogo inválido: %', v_item ->> 'catalog_item_id';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para o item %', v_catalog.name;
    end if;

    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, v_catalog.default_price);
    v_discount := coalesce((v_item ->> 'discount_amount')::numeric, 0);
    v_item_total := (v_unit_price * v_quantity) - v_discount;
    if v_item_total < 0 then
      raise exception 'Desconto maior que o valor do item %', v_catalog.name;
    end if;

    v_gross := v_gross + (v_unit_price * v_quantity);
    v_discount_total := v_discount_total + v_discount;
    v_direct_costs := v_direct_costs + (v_catalog.default_cost * v_quantity);
  end loop;

  v_final_status := coalesce(p_status, 'draft');

  insert into public.sales (
    user_id, business_id, customer_id, account_id, status,
    gross_amount, discount_amount, net_amount, direct_costs, fees,
    payment_method, sale_date, responsible, notes, client_request_id
  )
  values (
    auth.uid (), p_business_id, p_customer_id, p_account_id,
    -- Insere sempre como 'draft' primeiro: os efeitos de estoque/financeiro
    -- só rodam via apply_sale_status_effects logo abaixo, nunca implícitos
    -- no INSERT — mesma trilha de código de update_sale_status.
    'draft',
    v_gross, v_discount_total, v_gross - v_discount_total, v_direct_costs, coalesce(p_fees, 0),
    p_payment_method, p_sale_date, p_responsible, p_notes, p_client_request_id
  )
  on conflict (user_id, client_request_id) where (client_request_id is not null) do nothing
  returning * into v_sale;

  if v_sale.id is null then
    select * into v_sale
      from public.sales
      where user_id = auth.uid () and client_request_id = p_client_request_id;
    return v_sale;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_catalog
      from public.catalog_items
      where id = (v_item ->> 'catalog_item_id')::uuid and user_id = auth.uid ();

    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, v_catalog.default_price);
    v_discount := coalesce((v_item ->> 'discount_amount')::numeric, 0);

    insert into public.sale_items (
      user_id, sale_id, catalog_item_id, item_name, item_type,
      quantity, unit_price, unit_cost, discount_amount, tracks_inventory, total
    )
    values (
      auth.uid (), v_sale.id, v_catalog.id, v_catalog.name, v_catalog.type,
      v_quantity, v_unit_price, v_catalog.default_cost, v_discount, v_catalog.tracks_inventory,
      (v_unit_price * v_quantity) - v_discount
    );
  end loop;

  if v_final_status <> 'draft' then
    v_sale := public.apply_sale_status_effects(v_sale.id, 'draft', v_final_status);
  end if;

  return v_sale;
end;
$$;
