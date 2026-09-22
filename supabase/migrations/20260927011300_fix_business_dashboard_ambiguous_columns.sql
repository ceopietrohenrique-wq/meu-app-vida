-- Corrige get_business_dashboard_summary (20260927011200): `returns table
-- (direct_costs numeric, fees numeric, ...)` cria variáveis PL/pgSQL
-- implícitas com esses nomes, que colidem com as colunas
-- sales.direct_costs/sales.fees usadas sem alias — Postgres não consegue
-- decidir se `direct_costs` no SELECT é a coluna da tabela ou a variável de
-- saída (42702 "column reference is ambiguous"). Corrige qualificando a
-- tabela com alias.

create or replace function public.get_business_dashboard_summary(
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
    coalesce(sum(s.gross_amount), 0), coalesce(sum(s.net_amount), 0),
    coalesce(sum(s.direct_costs), 0), coalesce(sum(s.fees), 0), count(*)
    into v_gross, v_net, v_costs, v_fees, v_count
  from public.sales s
  where s.user_id = auth.uid ()
    and s.status = any (v_revenue_statuses)
    and s.sale_date between p_period_start and p_period_end
    and (p_business_id is null or s.business_id = p_business_id);

  select coalesce(sum(ft.amount), 0) into v_opex
  from public.finance_transactions ft
  where ft.user_id = auth.uid ()
    and ft.type = 'expense'
    and ft.context = 'empresarial'
    and ft.canceled_at is null
    and ft.transaction_date between p_period_start and p_period_end
    and (p_business_id is null or ft.business_id = p_business_id);

  select jsonb_build_object('catalog_item_id', ci.id, 'name', ci.name, 'quantity', top.total_qty)
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
  ) top
  join public.catalog_items ci on ci.id = top.catalog_item_id;

  select jsonb_build_object('catalog_item_id', ci.id, 'name', ci.name, 'profit', prof.total_profit)
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
  ) prof
  join public.catalog_items ci on ci.id = prof.catalog_item_id;

  select count(*) into v_leads
  from public.customers c
  where c.user_id = auth.uid ()
    and c.created_at::date between p_period_start and p_period_end
    and (p_business_id is null or c.business_id = p_business_id);

  select count(*) into v_closed
  from public.customers c
  where c.user_id = auth.uid ()
    and c.stage = 'fechado'
    and c.created_at::date between p_period_start and p_period_end
    and (p_business_id is null or c.business_id = p_business_id);

  select count(*) into v_pending
  from public.customers c
  where c.user_id = auth.uid ()
    and c.next_action_date is not null
    and (p_business_id is null or c.business_id = p_business_id);

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
