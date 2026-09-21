-- Resumo de XP de Saúde para a home de Saúde: soma de XP da semana corrente
-- vinda só dos event_type de comportamentos de saúde. Reaproveita
-- week_start_date() (mesma fonte de verdade usada por get_weekly_xp_summary
-- na Fase 1) para não haver dois lugares calculando "semana corrente" de
-- formas diferentes.

create function public.get_health_xp_summary ()
returns table (week_start_date date, weekly_health_xp bigint)
language plpgsql
as $$
declare
  v_week_start smallint;
  v_tz text;
  v_today date;
  v_week_start_date date;
  v_health_event_types constant text[] := array[
    'WEIGHT_LOGGED', 'WATER_GOAL_REACHED', 'MEAL_PLAN_ADHERENCE',
    'WORKOUT_COMPLETED', 'WALK_LOGGED'
  ];
begin
  select p.week_start, p.timezone
    into v_week_start, v_tz
    from public.profiles p
    where p.id = auth.uid ();

  if not found then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  v_today := (now () at time zone v_tz)::date;
  v_week_start_date := public.week_start_date(v_today, v_week_start);

  return query
  select
    v_week_start_date,
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = auth.uid ()
        and event_type = any (v_health_event_types)
        and (created_at at time zone v_tz)::date >= v_week_start_date
        and (created_at at time zone v_tz)::date < v_week_start_date + 7
    ), 0)::bigint;
end;
$$;

revoke all on function public.get_health_xp_summary () from public;
grant execute on function public.get_health_xp_summary () to authenticated;
