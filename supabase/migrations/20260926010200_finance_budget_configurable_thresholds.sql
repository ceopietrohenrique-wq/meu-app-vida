-- Auditoria Fase 4 > item 5: thresholds de alerta configuráveis por
-- orçamento, com 80/90/100 como padrão sugerido (CLAUDE.md > Fase 4 > 8:
-- "Padrões sugeridos: 80/90/100" — sugerido, não fixo).

alter table public.finance_budgets
  add column alert_thresholds smallint[] not null default '{80,90,100}';

-- Check constraints não aceitam subquery — a validação "todo elemento entre
-- 1 e 500" precisa de uma função auxiliar IMMUTABLE.
create function public.smallint_array_in_range(arr smallint[], lo smallint, hi smallint)
returns boolean
language plpgsql
immutable
as $$
declare
  v smallint;
begin
  if array_length(arr, 1) is null then
    return false;
  end if;
  foreach v in array arr
  loop
    if v < lo or v > hi then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.finance_budgets
  add constraint finance_budgets_alert_thresholds_valid check (
    public.smallint_array_in_range(alert_thresholds, 1::smallint, 500::smallint)
  );

comment on column public.finance_budgets.alert_thresholds is
  'Percentuais que disparam alerta (ex.: {80,90,100}). Configurável por orçamento na criação; 80/90/100 é só o padrão sugerido.';

-- finance_check_budget_alerts (20260925011100, corrigida em 20260925011300)
-- agora itera sobre os thresholds do PRÓPRIO orçamento em vez de uma lista
-- fixa no código — dedup continua sendo a mesma UNIQUE(budget_id,
-- threshold_percent, period_month), inalterada.
create or replace function public.finance_check_budget_alerts()
returns trigger
language plpgsql
as $$
declare
  v_budget public.finance_budgets;
  v_period date;
  v_realized numeric;
  v_percent numeric;
  v_threshold smallint;
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

  foreach v_threshold in array v_budget.alert_thresholds
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

-- finance_budget_alerts.threshold_percent tinha check fixo em (80,90,100) —
-- agora precisa aceitar qualquer threshold configurado no orçamento.
alter table public.finance_budget_alerts
  drop constraint finance_budget_alerts_threshold_percent_check;

alter table public.finance_budget_alerts
  add constraint finance_budget_alerts_threshold_percent_check
  check (threshold_percent between 1 and 500);
