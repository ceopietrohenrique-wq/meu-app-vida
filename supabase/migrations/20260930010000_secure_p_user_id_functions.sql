-- Auditoria final Fase 7 > item 1: get_progress_summary/
-- get_weekly_review_snapshot aceitam p_user_id explícito (necessário para
-- os jobs de resumo diário/semanal, que rodam sem sessão de usuário). Um
-- teste real contra o banco (ver supabase/tests/rls-fase7.test.ts) já
-- confirmou que RLS sozinha bloqueia usuário A lendo dado de B por esse
-- caminho (as subqueries internas continuam sujeitas às policies de cada
-- tabela, avaliadas com o `auth.uid()` REAL da sessão, não com p_user_id) —
-- mas depender só disso é frágil: se uma tabela nova entrar nessas funções
-- no futuro sem RLS completa, o bypass silencioso viraria possível. Guard
-- explícito, defesa em profundidade: só o próprio usuário (p_user_id =
-- auth.uid()) ou service_role (job) pode chamar com outro id.

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
  if p_user_id is distinct from auth.uid () and auth.role () <> 'service_role' then
    raise exception 'Acesso negado: não é possível consultar dados de outro usuário.';
  end if;

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
  if p_user_id is distinct from auth.uid () and auth.role () <> 'service_role' then
    raise exception 'Acesso negado: não é possível consultar dados de outro usuário.';
  end if;

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
