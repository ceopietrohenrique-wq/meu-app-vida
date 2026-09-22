-- Negócios > Dashboard empresarial. Ver docs/business-rules.md > Fase 5 >
-- Definições dos indicadores.
--
-- REVENUE_STATUSES = ('confirmed','paid','delivered') é a única fonte de
-- verdade de "venda válida" usada em TODOS os indicadores de receita/custo
-- — 'draft'/'negotiating' ainda não são vendas reais, 'cancelled'/
-- 'refunded' nunca contam (CLAUDE.md > Fase 5 > 6/11). Todo indicador é
-- calculado aqui a partir de dados reais (sales/sale_items/
-- finance_transactions/customers) — nunca mock.

create function public.get_business_dashboard_summary(
  p_period_start date,
  p_period_end date,
  p_business_id uuid default null
)
returns table (
  gross_revenue numeric,
  net_revenue numeric,
  direct_costs numeric,
  gross_profit numeric,
  operating_expenses numeric,
  fees numeric,
  net_profit numeric,
  margin_percent numeric,
  roi_percent numeric,
  sales_count bigint,
  average_ticket numeric,
  top_selling_item jsonb,
  most_profitable_item jsonb,
  leads_count bigint,
  conversion_percent numeric,
  pending_follow_ups_count bigint
)
language plpgsql
stable
as $$
declare
  v_revenue_statuses constant text[] := array['confirmed', 'paid', 'delivered'];
  v_gross numeric;
  v_net numeric;
  v_costs numeric;
  v_fees numeric;
  v_count bigint;
  v_opex numeric;
  v_top jsonb;
  v_profitable jsonb;
  v_leads bigint;
  v_closed bigint;
  v_pending bigint;
begin
  select
    coalesce(sum(gross_amount), 0), coalesce(sum(net_amount), 0),
    coalesce(sum(direct_costs), 0), coalesce(sum(fees), 0), count(*)
    into v_gross, v_net, v_costs, v_fees, v_count
  from public.sales
  where user_id = auth.uid ()
    and status = any (v_revenue_statuses)
    and sale_date between p_period_start and p_period_end
    and (p_business_id is null or business_id = p_business_id);

  -- "Despesas operacionais atribuídas" reaproveita o Financeiro (Fase 4) —
  -- nunca uma segunda tabela de despesas duplicando o mesmo conceito.
  select coalesce(sum(amount), 0) into v_opex
  from public.finance_transactions
  where user_id = auth.uid ()
    and type = 'expense'
    and context = 'empresarial'
    and canceled_at is null
    and transaction_date between p_period_start and p_period_end
    and (p_business_id is null or business_id = p_business_id);

  select jsonb_build_object('catalog_item_id', ci.id, 'name', ci.name, 'quantity', s.total_qty)
    into v_top
  from (
    select si.catalog_item_id, sum(si.quantity) as total_qty
    from public.sale_items si
    join public.sales sa on sa.id = si.sale_id
    where si.user_id = auth.uid ()
      and sa.status = any (v_revenue_statuses)
      and sa.sale_date between p_period_start and p_period_end
      and (p_business_id is null or sa.business_id = p_business_id)
    group by si.catalog_item_id
    order by total_qty desc
    limit 1
  ) s
  join public.catalog_items ci on ci.id = s.catalog_item_id;

  select jsonb_build_object('catalog_item_id', ci.id, 'name', ci.name, 'profit', p.total_profit)
    into v_profitable
  from (
    select si.catalog_item_id,
      sum((si.unit_price * si.quantity) - si.discount_amount - (si.unit_cost * si.quantity)) as total_profit
    from public.sale_items si
    join public.sales sa on sa.id = si.sale_id
    where si.user_id = auth.uid ()
      and sa.status = any (v_revenue_statuses)
      and sa.sale_date between p_period_start and p_period_end
      and (p_business_id is null or sa.business_id = p_business_id)
    group by si.catalog_item_id
    order by total_profit desc
    limit 1
  ) p
  join public.catalog_items ci on ci.id = p.catalog_item_id;

  -- Leads = clientes/leads criados no período (cohort de criação — ver
  -- docs/business-rules.md sobre a simplificação de "conversão").
  select count(*) into v_leads
  from public.customers
  where user_id = auth.uid ()
    and created_at::date between p_period_start and p_period_end
    and (p_business_id is null or business_id = p_business_id);

  select count(*) into v_closed
  from public.customers
  where user_id = auth.uid ()
    and stage = 'fechado'
    and created_at::date between p_period_start and p_period_end
    and (p_business_id is null or business_id = p_business_id);

  select count(*) into v_pending
  from public.customers
  where user_id = auth.uid ()
    and next_action_date is not null
    and (p_business_id is null or business_id = p_business_id);

  return query select
    v_gross,
    v_net,
    v_costs,
    (v_net - v_costs),
    v_opex,
    v_fees,
    (v_net - v_costs - v_opex - v_fees),
    case when v_net > 0 then ((v_net - v_costs) / v_net) * 100 else null end,
    case when v_costs > 0 then ((v_net - v_costs) / v_costs) * 100 else null end,
    v_count,
    case when v_count > 0 then v_net / v_count else null end,
    v_top,
    v_profitable,
    v_leads,
    case when v_leads > 0 then (v_closed::numeric / v_leads) * 100 else null end,
    v_pending;
end;
$$;

revoke all on function public.get_business_dashboard_summary (date, date, uuid) from public;
grant execute on function public.get_business_dashboard_summary (date, date, uuid) to authenticated;
