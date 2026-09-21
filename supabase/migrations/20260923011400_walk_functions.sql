-- Saúde > Caminhada: registrar caminhada e XP idempotente (no máximo uma vez
-- por dia, independente de quantas caminhadas o usuário registrar naquele
-- dia — mesma granularidade de HABIT:{habit_id}:{date}).

create function public.log_walk(p_date date, p_duration_minutes integer, p_distance_km numeric default null)
returns table (walk_log_row public.walk_logs, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_log public.walk_logs;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 15;
begin
  insert into public.walk_logs (user_id, date, duration_minutes, distance_km)
  values (auth.uid (), p_date, p_duration_minutes, p_distance_km)
  returning * into v_log;

  v_source_key := 'WALK_LOGGED:' || p_date::text;

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'WALK_LOGGED', 'walk_log', v_log.id, v_xp_amount, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_log, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.log_walk (date, integer, numeric) from public;
grant execute on function public.log_walk (date, integer, numeric) to authenticated;
