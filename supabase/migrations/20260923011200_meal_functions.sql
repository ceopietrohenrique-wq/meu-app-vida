-- Saúde > Alimentação: marcar status de uma refeição planejada num dia e
-- conceder XP de adesão só quando "realizada" (ver docs/business-rules.md >
-- Fase 2 > Alimentação). Idempotente via UNIQUE(meal_plan_id, date): mudar
-- o status do mesmo dia várias vezes nunca duplica o log, e o XP, uma vez
-- concedido, nunca é revogado ao mudar o status depois (mesma regra 1.4 dos
-- hábitos).

create function public.set_meal_log_status(p_meal_plan_id uuid, p_date date, p_status text)
returns table (meal_log_row public.meal_logs, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_plan public.meal_plans;
  v_log public.meal_logs;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 20;
begin
  select * into v_plan from public.meal_plans
    where id = p_meal_plan_id and user_id = auth.uid ();

  if not found then
    raise exception 'Refeição planejada não encontrada' using errcode = 'P0002';
  end if;

  insert into public.meal_logs (user_id, meal_plan_id, date, status)
  values (auth.uid (), p_meal_plan_id, p_date, p_status)
  on conflict (meal_plan_id, date)
    do update set status = excluded.status, updated_at = now()
  returning * into v_log;

  if p_status = 'realizada' then
    v_source_key := 'MEAL_PLAN_ADHERENCE:' || p_meal_plan_id::text || ':' || p_date::text;

    insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
    values (auth.uid (), 'MEAL_PLAN_ADHERENCE', 'meal_log', v_log.id, v_xp_amount, v_source_key)
    on conflict (user_id, source_key) do nothing;

    get diagnostics v_xp_inserted = row_count;
  else
    v_xp_inserted := 0;
  end if;

  return query select v_log, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.set_meal_log_status (uuid, date, text) from public;
grant execute on function public.set_meal_log_status (uuid, date, text) to authenticated;
