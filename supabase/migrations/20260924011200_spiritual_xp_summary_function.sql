-- Resumo de XP espiritual da semana corrente, mesma filosofia de
-- get_health_xp_summary (Fase 2): filtra só os event_type de comportamentos
-- espirituais, reaproveita week_start_date() como fonte única de "semana
-- corrente".

create function public.get_spiritual_xp_summary ()
returns table (week_start_date date, weekly_spiritual_xp bigint)
language plpgsql
as $$
declare
  v_week_start smallint;
  v_tz text;
  v_today date;
  v_week_start_date date;
  v_spiritual_event_types constant text[] := array[
    'DEVOTIONAL', 'READING_PLAN_DAY_COMPLETED'
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
        and event_type = any (v_spiritual_event_types)
        and (created_at at time zone v_tz)::date >= v_week_start_date
        and (created_at at time zone v_tz)::date < v_week_start_date + 7
    ), 0)::bigint;
end;
$$;

revoke all on function public.get_spiritual_xp_summary () from public;
grant execute on function public.get_spiritual_xp_summary () to authenticated;
