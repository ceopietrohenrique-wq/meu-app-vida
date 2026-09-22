-- Progresso > Dashboard consolidado + Analytics. Ver docs/business-rules.md
-- > Fase 6 > Dashboard consolidado.
--
-- Contagens brutas entre domínios para o período escolhido (7d/30d/3m/6m/
--1a). Financeiro e Negócios NÃO são recalculados aqui — a página de
-- Progresso reaproveita get_finance_dashboard_summary/
-- get_business_dashboard_summary diretamente (já existem, já são a fonte
-- de verdade), nunca uma segunda função somando as mesmas tabelas de novo.

create function public.get_progress_summary(
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
begin
  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = auth.uid () and created_at::date between p_period_start and p_period_end
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

revoke all on function public.get_progress_summary (date, date) from public;
grant execute on function public.get_progress_summary (date, date) to authenticated;

-- Série diária de XP para o gráfico de tendência (analytics). Período longo
-- (1 ano) pode devolver até ~365 linhas — aceitável para um gráfico.
create function public.get_xp_trend(
  p_period_start date,
  p_period_end date
)
returns table (day date, xp_amount bigint)
language sql
stable
as $$
  select created_at::date as day, sum(xp_amount)::bigint
  from public.xp_events
  where user_id = auth.uid () and created_at::date between p_period_start and p_period_end
  group by created_at::date
  order by created_at::date;
$$;

revoke all on function public.get_xp_trend (date, date) from public;
grant execute on function public.get_xp_trend (date, date) to authenticated;
