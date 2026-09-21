-- Resumo de XP para a Tela Hoje: XP total, XP da semana corrente e meta
-- semanal. Cálculo de "semana corrente" reaproveita week_start_date() para
-- ser exatamente a mesma lógica usada pela notificação de meta batida —
-- evita dois lugares divergentes calculando a mesma coisa.

create function public.get_weekly_xp_summary ()
returns table (week_start_date date, weekly_xp bigint, weekly_goal integer, total_xp bigint)
language plpgsql
as $$
declare
  v_week_start smallint;
  v_goal integer;
  v_tz text;
  v_today date;
  v_week_start_date date;
begin
  select p.week_start, p.weekly_xp_goal, p.timezone
    into v_week_start, v_goal, v_tz
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
        and (created_at at time zone v_tz)::date >= v_week_start_date
        and (created_at at time zone v_tz)::date < v_week_start_date + 7
    ), 0)::bigint,
    v_goal,
    coalesce((select sum(xp_amount) from public.xp_events where user_id = auth.uid ()), 0)::bigint;
end;
$$;

revoke all on function public.get_weekly_xp_summary () from public;
grant execute on function public.get_weekly_xp_summary () to authenticated;
