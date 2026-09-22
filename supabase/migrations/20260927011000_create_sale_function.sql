-- Negócios > Vendas: criação atômica e idempotente. Ver
-- docs/business-rules.md > Fase 5 > Vendas.
--
-- Uma única RPC cria o cabeçalho da venda (sales) + o snapshot de cada item
-- (sale_items) numa única transação — nunca duas mutations soltas que
-- podem ficar "pela metade" se o client cair no meio (CLAUDE.md > Fase 5 >
-- 9). Totais (gross/discount/net/direct_costs) são SEMPRE calculados aqui
-- a partir dos itens recebidos, nunca aceitos prontos do client — a única
-- forma de garantir que sales.net_amount corresponde de verdade à soma de
-- sale_items.
--
-- Idempotência real de double-submit: client_request_id + UNIQUE(user_id,
-- client_request_id) + INSERT ... ON CONFLICT DO NOTHING. Reenviar a mesma
-- chave nunca insere uma segunda venda nem duplica os itens (o loop de
-- sale_items só roda quando o INSERT de sales realmente aconteceu).
--
-- p_items: jsonb array de {catalog_item_id, quantity, unit_price?, discount_amount?}.
-- unit_price/discount_amount ausentes usam o default do catálogo / 0.

create function public.create_sale(
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
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Uma venda precisa de ao menos um item.';
  end if;

  -- Primeira passada: valida e soma os itens (sem escrever nada ainda) para
  -- que a linha de `sales` já nasça com os totais corretos.
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

  insert into public.sales (
    user_id, business_id, customer_id, account_id, status,
    gross_amount, discount_amount, net_amount, direct_costs, fees,
    payment_method, sale_date, responsible, notes, client_request_id
  )
  values (
    auth.uid (), p_business_id, p_customer_id, p_account_id, coalesce(p_status, 'draft'),
    v_gross, v_discount_total, v_gross - v_discount_total, v_direct_costs, coalesce(p_fees, 0),
    p_payment_method, p_sale_date, p_responsible, p_notes, p_client_request_id
  )
  on conflict (user_id, client_request_id) where (client_request_id is not null) do nothing
  returning * into v_sale;

  if v_sale.id is null then
    -- Conflito: já existe uma venda com essa client_request_id (reenvio de
    -- double-submit) — os itens já foram inseridos na primeira chamada.
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

  return v_sale;
end;
$$;

revoke all on function public.create_sale (
  uuid, jsonb, uuid, uuid, uuid, text, numeric, text, date, text, text
) from public;
grant execute on function public.create_sale (
  uuid, jsonb, uuid, uuid, uuid, text, numeric, text, date, text, text
) to authenticated;
