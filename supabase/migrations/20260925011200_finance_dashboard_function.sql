-- Financeiro > saldo de contas e dashboard. Ver docs/business-rules.md >
-- Fase 4 > Regras de soma / Dashboard.
--
-- Saldo de conta e agregados do dashboard são SEMPRE calculados aqui (nunca
-- coluna mutável) para nunca dessincronizar de finance_transactions —
-- mesma filosofia de streak/volume de treino já usada nas fases anteriores.

create function public.get_finance_accounts_with_balance()
returns table (
  id uuid,
  name text,
  type text,
  initial_balance numeric,
  is_active boolean,
  context text,
  created_at timestamptz,
  updated_at timestamptz,
  balance numeric
)
language plpgsql
stable
as $$
begin
  return query
  select
    a.id, a.name, a.type, a.initial_balance, a.is_active, a.context, a.created_at, a.updated_at,
    a.initial_balance
      + coalesce(sum(case when t.type = 'income' and t.account_id = a.id then t.amount else 0 end), 0)
      - coalesce(sum(case when t.type = 'expense' and t.account_id = a.id then t.amount else 0 end), 0)
      - coalesce(sum(case when t.type = 'transfer' and t.account_id = a.id then t.amount else 0 end), 0)
      + coalesce(sum(case when t.type = 'transfer' and t.transfer_account_id = a.id then t.amount else 0 end), 0)
      as balance
  from public.finance_accounts a
  left join public.finance_transactions t
    on t.user_id = a.user_id
    and t.canceled_at is null
    and (t.account_id = a.id or t.transfer_account_id = a.id)
  where a.user_id = auth.uid ()
  group by a.id
  order by a.created_at;
end;
$$;

revoke all on function public.get_finance_accounts_with_balance () from public;
grant execute on function public.get_finance_accounts_with_balance () to authenticated;

-- Regras de soma do dashboard (CLAUDE.md > Fase 4 > 10): receita/despesa
-- somam apenas transações não canceladas do período e do contexto pedido;
-- transferências NUNCA entram em income/expense (só afetam saldo de conta).
-- p_context = 'consolidado' soma pessoal + empresarial explicitamente —
-- nunca é o comportamento padrão do dashboard (CLAUDE.md > Fase 4 > 4).
create function public.get_finance_dashboard_summary(
  p_context text,
  p_period_start date,
  p_period_end date
)
returns table (
  income numeric,
  expense numeric,
  balance numeric,
  previous_income numeric,
  previous_expense numeric,
  top_categories jsonb
)
language plpgsql
stable
as $$
declare
  v_income numeric;
  v_expense numeric;
  v_prev_start date;
  v_prev_end date;
  v_prev_income numeric;
  v_prev_expense numeric;
  v_top_categories jsonb;
begin
  select
    coalesce(sum(amount) filter (where type = 'income'), 0),
    coalesce(sum(amount) filter (where type = 'expense'), 0)
    into v_income, v_expense
    from public.finance_transactions
    where user_id = auth.uid ()
      and canceled_at is null
      and transaction_date between p_period_start and p_period_end
      and (p_context = 'consolidado' or context = p_context);

  v_prev_end := p_period_start - 1;
  v_prev_start := v_prev_end - (p_period_end - p_period_start);

  select
    coalesce(sum(amount) filter (where type = 'income'), 0),
    coalesce(sum(amount) filter (where type = 'expense'), 0)
    into v_prev_income, v_prev_expense
    from public.finance_transactions
    where user_id = auth.uid ()
      and canceled_at is null
      and transaction_date between v_prev_start and v_prev_end
      and (p_context = 'consolidado' or context = p_context);

  select coalesce(jsonb_agg(row_to_json(c) order by c.total desc), '[]'::jsonb) into v_top_categories
    from (
      select fc.id as category_id, fc.name as category_name, sum(ft.amount) as total
        from public.finance_transactions ft
        join public.finance_categories fc on fc.id = ft.category_id
        where ft.user_id = auth.uid ()
          and ft.canceled_at is null
          and ft.type = 'expense'
          and ft.transaction_date between p_period_start and p_period_end
          and (p_context = 'consolidado' or ft.context = p_context)
        group by fc.id, fc.name
        order by sum(ft.amount) desc
        limit 5
    ) c;

  return query select
    v_income, v_expense, (v_income - v_expense),
    v_prev_income, v_prev_expense, v_top_categories;
end;
$$;

revoke all on function public.get_finance_dashboard_summary (text, date, date) from public;
grant execute on function public.get_finance_dashboard_summary (text, date, date) to authenticated;
