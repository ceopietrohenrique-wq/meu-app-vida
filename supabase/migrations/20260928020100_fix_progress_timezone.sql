-- Auditoria final Fase 6 > item 1/2 (timezone/date-only).
--
-- get_weekly_review_snapshot, get_progress_summary e get_xp_trend usavam
-- created_at::date (data no fuso do servidor/sessão Postgres) para colunas
-- timestamptz (xp_events.created_at, customers.created_at), em vez de
-- converter para o fuso do usuário (profiles.timezone) antes de truncar —
-- o mesmo padrão já usado em get_daily_review_snapshot/get_xp_weekly_summary/
-- get_health_xp_weekly_summary/get_spiritual_xp_weekly_summary
-- ((created_at at time zone v_tz)::date). Sem a conversão, um evento de XP
-- registrado às 23h de um usuário em UTC-3 podia cair no dia seguinte do
-- snapshot/RPC (servidor roda em UTC), fazendo a semana/período mostrado
-- discordar do que o usuário vê na tela "Hoje". As demais colunas usadas
-- nestas RPCs (due_date, date, transaction_date, sale_date) já são `date`
-- puro — sem componente de hora, não sofrem desse problema.

create or replace function public.get_weekly_review_snapshot(p_week_start date)
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
  select timezone into v_tz from public.profiles where id = auth.uid ();

  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = auth.uid ()
        and (created_at at time zone v_tz)::date between p_week_start and v_week_end
    ), 0)::bigint,
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_week_start and v_week_end
        and status = 'concluida'),
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_week_start and v_week_end
        and status <> 'cancelada'),
    (select count(*)::integer from public.habit_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(*)::integer from public.workout_sessions
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and completed_at is not null),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and status = 'realizada'),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(distinct wl.date)::integer from public.water_logs wl
      where wl.user_id = auth.uid () and wl.date between p_week_start and v_week_end
        and (
          select coalesce(sum(w2.amount_ml), 0) from public.water_logs w2
          where w2.user_id = wl.user_id and w2.date = wl.date
        ) >= (select daily_goal_ml from public.water_settings where user_id = auth.uid ())),
    (select count(*)::integer from public.devotionals
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and read_done and reflection_done and prayer_done),
    (select count(distinct date)::integer from public.reading_plan_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(*)::integer from public.weight_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    coalesce((
      select sum(amount) from public.finance_transactions
      where user_id = auth.uid () and context = 'pessoal' and type = 'expense'
        and canceled_at is null
        and transaction_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount) from public.sales
      where user_id = auth.uid () and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount - direct_costs) from public.sales
      where user_id = auth.uid () and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    (select count(*)::integer from public.customers
      where user_id = auth.uid ()
        and (created_at at time zone v_tz)::date between p_week_start and v_week_end);
end;
$$;

create or replace function public.get_progress_summary(
  p_period_start date,
  p_period_end date
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
  select timezone into v_tz from public.profiles where id = auth.uid ();

  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = auth.uid ()
        and (created_at at time zone v_tz)::date between p_period_start and p_period_end
    ), 0)::bigint,
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_period_start and p_period_end
        and status = 'concluida'),
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_period_start and p_period_end
        and status <> 'cancelada'),
    (select count(*)::integer from public.habit_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end),
    (select count(*)::integer from public.workout_sessions
      where user_id = auth.uid () and date between p_period_start and p_period_end
        and completed_at is not null),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end
        and status = 'realizada'),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end),
    (select count(distinct wl.date)::integer from public.water_logs wl
      where wl.user_id = auth.uid () and wl.date between p_period_start and p_period_end
        and (
          select coalesce(sum(w2.amount_ml), 0) from public.water_logs w2
          where w2.user_id = wl.user_id and w2.date = wl.date
        ) >= (select daily_goal_ml from public.water_settings where user_id = auth.uid ())),
    (select count(*)::integer from public.devotionals
      where user_id = auth.uid () and date between p_period_start and p_period_end
        and read_done and reflection_done and prayer_done),
    (select count(distinct date)::integer from public.reading_plan_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end),
    (select count(*)::integer from public.weight_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end),
    (select weight_kg from public.weight_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end
      order by date asc limit 1),
    (select weight_kg from public.weight_logs
      where user_id = auth.uid () and date between p_period_start and p_period_end
      order by date desc limit 1);
end;
$$;

create or replace function public.get_xp_trend(
  p_period_start date,
  p_period_end date
)
returns table (day date, xp_amount bigint)
language plpgsql
stable
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = auth.uid ();

  return query
  select (created_at at time zone v_tz)::date as day, sum(xp_amount)::bigint
  from public.xp_events
  where user_id = auth.uid ()
    and (created_at at time zone v_tz)::date between p_period_start and p_period_end
  group by (created_at at time zone v_tz)::date
  order by (created_at at time zone v_tz)::date;
end;
$$;
