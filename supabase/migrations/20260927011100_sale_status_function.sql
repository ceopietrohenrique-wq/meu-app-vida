-- Negócios > Transição de status da venda: atômica e idempotente. Ver
-- docs/business-rules.md > Fase 5 > Vendas/Estoque.
--
-- Uma venda passa por vários status ao longo do tempo (draft → confirmed →
-- paid → ...), então a idempotência de double-submit não pode usar uma
-- única coluna em `sales` (cada transição precisa da sua própria chave) —
-- daqui o log dedicado `sale_status_changes`.
--
-- A garantia real contra baixar/reverter estoque ou lançar receita duas
-- vezes NÃO é o client_request_id sozinho: são os guards
-- sales.stock_deducted_at / stock_reverted_at / revenue_transaction_id,
-- checados sob `SELECT ... FOR UPDATE` (serializa chamadas concorrentes
-- sobre a MESMA venda) — assim, mesmo duas chamadas com client_request_id
-- diferentes (não só retries idênticos) nunca duplicam o efeito colateral.

create table public.sale_status_changes (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  sale_id uuid not null references public.sales (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  client_request_id uuid,
  created_at timestamptz not null default now()
);

create index sale_status_changes_sale_id_idx on public.sale_status_changes (sale_id);

create unique index sale_status_changes_client_request_id_unique
  on public.sale_status_changes (user_id, client_request_id)
  where client_request_id is not null;

alter table public.sale_status_changes enable row level security;

create policy sale_status_changes_select_own
  on public.sale_status_changes for select using (auth.uid () = user_id);

create policy sale_status_changes_insert_own
  on public.sale_status_changes for insert with check (auth.uid () = user_id);

create function public.update_sale_status(
  p_sale_id uuid,
  p_new_status text,
  p_client_request_id uuid default null
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

  -- Mesmo status: idempotente, nenhum efeito colateral roda de novo.
  if v_sale.status = p_new_status then
    return v_sale;
  end if;

  -- Baixa de estoque: só na PRIMEIRA vez que a venda entra num status
  -- comprometido (confirmed/paid/delivered).
  if p_new_status = any (v_committed_statuses)
     and not (v_sale.status = any (v_committed_statuses))
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

  -- Reflexo financeiro: só na PRIMEIRA vez que a venda entra em 'paid', e só
  -- se a venda tiver conta de destino definida (opt-in, ver 20260927010400).
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

  -- Estorno de estoque: só quando havia sido baixado e ainda não revertido.
  -- Não há reversão financeira automática (ver docs/architecture.md >
  -- decisão "Reversão financeira de venda reembolsada").
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

revoke all on function public.update_sale_status (uuid, text, uuid) from public;
grant execute on function public.update_sale_status (uuid, text, uuid) to authenticated;
