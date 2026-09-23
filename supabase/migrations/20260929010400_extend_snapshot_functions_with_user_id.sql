-- Fase 7 > Resumo diário/semanal precisam calcular para QUALQUER usuário
-- (o job roda em background, sem sessão autenticada — auth.uid() é null
-- fora de um request do usuário), não só "o usuário logado agora".
--
-- Em vez de duplicar a lógica de get_progress_summary/
-- get_weekly_review_snapshot (Fase 6) num "get_progress_summary_for_job"
-- paralelo, as duas funções ganham um parâmetro `p_user_id` com default
-- `auth.uid()` — chamadas existentes do app (sem esse argumento) continuam
-- se comportando exatamente igual (default = usuário logado), e o job novo
-- passa o id explícito. CREATE OR REPLACE aceita adicionar parâmetro com
-- default sem quebrar a assinatura existente, então nenhum client precisa
-- mudar. Ver docs/business-rules.md > Fase 7 > Resumo semanal.

create or replace function public.get_progress_summary(
  p_period_start date,
  p_period_end date,
  p_user_id uuid default auth.uid ()
)
returns table (
  xp_total bigint,
  tasks_completed integer,
  tasks_total integer,
  habit_logs_count integer,
  workouts_completed integer,
  meals_adherent integer,
  meals_planned integer,
  water_goal_days integer,
  devotional_days integer,
  bible_reading_days integer,
  weight_logs_count integer,
  first_weight_kg numeric,
  latest_weight_kg numeric
)
language plpgsql
stable
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = p_user_id;

  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = p_user_id
        and (created_at at time zone v_tz)::date between p_period_start and p_period_end
    ), 0)::bigint,
    (select count(*)::integer from public.tasks
      where user_id = p_user_id and due_date between p_period_start and p_period_end
        and status = 'concluida'),
    (select count(*)::integer from public.tasks
      where user_id = p_user_id and due_date between p_period_start and p_period_end
        and status <> 'cancelada'),
    (select count(*)::integer from public.habit_logs
      where user_id = p_user_id and date between p_period_start and p_period_end),
    (select count(*)::integer from public.workout_sessions
      where user_id = p_user_id and date between p_period_start and p_period_end
        and completed_at is not null),
    (select count(*)::integer from public.meal_logs
      where user_id = p_user_id and date between p_period_start and p_period_end
        and status = 'realizada'),
    (select count(*)::integer from public.meal_logs
      where user_id = p_user_id and date between p_period_start and p_period_end),
    (select count(distinct wl.date)::integer from public.water_logs wl
      where wl.user_id = p_user_id and wl.date between p_period_start and p_period_end
        and (
          select coalesce(sum(w2.amount_ml), 0) from public.water_logs w2
          where w2.user_id = wl.user_id and w2.date = wl.date
        ) >= (select daily_goal_ml from public.water_settings where user_id = p_user_id)),
    (select count(*)::integer from public.devotionals
      where user_id = p_user_id and date between p_period_start and p_period_end
        and read_done and reflection_done and prayer_done),
    (select count(distinct date)::integer from public.reading_plan_logs
      where user_id = p_user_id and date between p_period_start and p_period_end),
    (select count(*)::integer from public.weight_logs
      where user_id = p_user_id and date between p_period_start and p_period_end),
    (select weight_kg from public.weight_logs
      where user_id = p_user_id and date between p_period_start and p_period_end
      order by date asc limit 1),
    (select weight_kg from public.weight_logs
      where user_id = p_user_id and date between p_period_start and p_period_end
      order by date desc limit 1);
end;
$$;

revoke all on function public.get_progress_summary (date, date, uuid) from public;
grant execute on function public.get_progress_summary (date, date, uuid) to authenticated, service_role;

create or replace function public.get_weekly_review_snapshot(
  p_week_start date,
  p_user_id uuid default auth.uid ()
)
returns table (
  xp_earned bigint,
  tasks_completed integer,
  tasks_total integer,
  habits_completed integer,
  workouts_completed integer,
  meals_adherent integer,
  meals_planned integer,
  water_goal_days integer,
  devotional_days integer,
  bible_reading_days integer,
  weight_logs_count integer,
  personal_expenses numeric,
  sales_revenue numeric,
  sales_profit numeric,
  leads_count integer
)
language plpgsql
stable
as $$
declare
  v_week_end date := p_week_start + 6;
  v_revenue_statuses constant text[] := array['confirmed', 'paid', 'delivered'];
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = p_user_id;

  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = p_user_id
        and (created_at at time zone v_tz)::date between p_week_start and v_week_end
    ), 0)::bigint,
    (select count(*)::integer from public.tasks
      where user_id = p_user_id and due_date between p_week_start and v_week_end
        and status = 'concluida'),
    (select count(*)::integer from public.tasks
      where user_id = p_user_id and due_date between p_week_start and v_week_end
        and status <> 'cancelada'),
    (select count(*)::integer from public.habit_logs
      where user_id = p_user_id and date between p_week_start and v_week_end),
    (select count(*)::integer from public.workout_sessions
      where user_id = p_user_id and date between p_week_start and v_week_end
        and completed_at is not null),
    (select count(*)::integer from public.meal_logs
      where user_id = p_user_id and date between p_week_start and v_week_end
        and status = 'realizada'),
    (select count(*)::integer from public.meal_logs
      where user_id = p_user_id and date between p_week_start and v_week_end),
    (select count(distinct wl.date)::integer from public.water_logs wl
      where wl.user_id = p_user_id and wl.date between p_week_start and v_week_end
        and (
          select coalesce(sum(w2.amount_ml), 0) from public.water_logs w2
          where w2.user_id = wl.user_id and w2.date = wl.date
        ) >= (select daily_goal_ml from public.water_settings where user_id = p_user_id)),
    (select count(*)::integer from public.devotionals
      where user_id = p_user_id and date between p_week_start and v_week_end
        and read_done and reflection_done and prayer_done),
    (select count(distinct date)::integer from public.reading_plan_logs
      where user_id = p_user_id and date between p_week_start and v_week_end),
    (select count(*)::integer from public.weight_logs
      where user_id = p_user_id and date between p_week_start and v_week_end),
    coalesce((
      select sum(amount) from public.finance_transactions
      where user_id = p_user_id and context = 'pessoal' and type = 'expense'
        and canceled_at is null
        and transaction_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount) from public.sales
      where user_id = p_user_id and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount - direct_costs) from public.sales
      where user_id = p_user_id and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    (select count(*)::integer from public.customers
      where user_id = p_user_id
        and (created_at at time zone v_tz)::date between p_week_start and v_week_end);
end;
$$;

revoke all on function public.get_weekly_review_snapshot (date, uuid) from public;
grant execute on function public.get_weekly_review_snapshot (date, uuid) to authenticated, service_role;
