-- Financeiro > Alertas de orçamento. Ver docs/business-rules.md > Fase 4 >
-- Orçamentos/Alertas.
--
-- Trigger (não RPC dedicada) para que QUALQUER inserção de transação de
-- despesa — via client direto ou via generate_finance_recurrence_occurrences
-- — dispare a checagem, sem duplicar a lógica em dois lugares. Dedup real é
-- a UNIQUE(budget_id, threshold_percent, period_month) de
-- finance_budget_alerts; esta função só decide QUANDO tentar inserir.

create function public.finance_check_budget_alerts()
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
        on conflict (user_id, notification_key) do nothing;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

create trigger finance_transactions_check_budget_alerts
after insert or update on public.finance_transactions
for each row
execute function public.finance_check_budget_alerts();
