-- Saúde > Água: registrar consumo e conceder XP a única vez por dia ao
-- atingir a meta (ver docs/business-rules.md > Fase 2 > Água). O cliente usa
-- `goal_reached` no retorno para parar de agendar lembretes daquele dia —
-- decisão tomada aqui, não recalculada solta na UI.

create function public.log_water(p_amount_ml integer, p_date date)
returns table (
  water_log_row public.water_logs,
  total_ml integer,
  goal_ml integer,
  goal_reached boolean,
  xp_awarded boolean,
  xp_amount integer
)
language plpgsql
as $$
declare
  v_log public.water_logs;
  v_total integer;
  v_goal integer;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 10;
begin
  insert into public.water_logs (user_id, date, amount_ml)
  values (auth.uid (), p_date, p_amount_ml)
  returning * into v_log;

  select coalesce(sum(amount_ml), 0)::integer into v_total
    from public.water_logs
    where user_id = auth.uid () and date = p_date;

  select daily_goal_ml into v_goal
    from public.water_settings
    where user_id = auth.uid ();

  if not found then
    v_goal := 2000;
  end if;

  if v_total >= v_goal then
    v_source_key := 'WATER_GOAL:' || p_date::text;

    insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
    values (auth.uid (), 'WATER_GOAL_REACHED', 'water_log', v_log.id, v_xp_amount, v_source_key)
    on conflict (user_id, source_key) do nothing;

    get diagnostics v_xp_inserted = row_count;
  else
    v_xp_inserted := 0;
  end if;

  return query select v_log, v_total, v_goal, (v_total >= v_goal), (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.log_water (integer, date) from public;
grant execute on function public.log_water (integer, date) to authenticated;

create function public.set_water_goal(p_daily_goal_ml integer)
returns public.water_settings
language plpgsql
as $$
declare
  v_settings public.water_settings;
begin
  insert into public.water_settings (user_id, daily_goal_ml)
  values (auth.uid (), p_daily_goal_ml)
  on conflict (user_id) do update set daily_goal_ml = excluded.daily_goal_ml
  returning * into v_settings;

  return v_settings;
end;
$$;

revoke all on function public.set_water_goal (integer) from public;
grant execute on function public.set_water_goal (integer) to authenticated;
