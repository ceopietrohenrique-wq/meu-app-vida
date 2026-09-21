-- Corrige finance_check_budget_alerts (20260925011100): o índice único de
-- notifications é PARCIAL (`where notification_key is not null`), então o
-- `on conflict (user_id, notification_key)` precisa repetir esse predicado
-- para o Postgres conseguir escolher o índice como arbiter — sem ele, o
-- INSERT falha com 42P10 "no unique or exclusion constraint matching the
-- ON CONFLICT specification" (pego pelo teste de integração
-- finance-idempotency-fase4.test.ts).

create or replace function public.finance_check_budget_alerts()
returns trigger
language plpgsql
as $$
declare
  v_budget public.finance_budgets;
  v_period date;
  v_realized numeric;
  v_percent numeric;
  v_threshold integer;
  v_category_name text;
  v_alert_id uuid;
begin
  if new.type <> 'expense' or new.category_id is null or new.canceled_at is not null then
    return new;
  end if;

  v_period := date_trunc('month', new.transaction_date)::date;

  select * into v_budget
    from public.finance_budgets
    where user_id = new.user_id
      and category_id = new.category_id
      and period_month = v_period;

  if not found then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_realized
    from public.finance_transactions
    where user_id = new.user_id
      and category_id = new.category_id
      and type = 'expense'
      and canceled_at is null
      and date_trunc('month', transaction_date)::date = v_period;

  v_percent := (v_realized / v_budget.planned_amount) * 100;

  select name into v_category_name from public.finance_categories where id = new.category_id;

  foreach v_threshold in array array[80, 90, 100]
  loop
    if v_percent >= v_threshold then
      v_alert_id := null;

      insert into public.finance_budget_alerts (user_id, budget_id, threshold_percent, period_month)
      values (new.user_id, v_budget.id, v_threshold, v_period)
      on conflict (budget_id, threshold_percent, period_month) do nothing
      returning id into v_alert_id;

      if v_alert_id is not null then
        insert into public.notifications (user_id, type, title, body, notification_key)
        values (
          new.user_id,
          'BUDGET_ALERT',
          'Orçamento de ' || coalesce(v_category_name, 'categoria') || ' em ' || v_threshold || '%',
          'Você utilizou ' || v_threshold || '% do orçamento de ' || coalesce(v_category_name, 'categoria') || '.',
          'BUDGET_ALERT:' || v_budget.id || ':' || v_threshold || ':' || v_period
        )
        on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
      end if;
    end if;
  end loop;

  return new;
end;
$$;
