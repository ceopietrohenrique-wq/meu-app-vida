-- Espiritual > Plano de leitura: concluir o dia do plano com XP idempotente
-- (no máximo uma vez por dia do plano — UNIQUE(reading_plan_id, day_number)
-- garante que nunca duplica a conclusão do mesmo dia). Ver
-- docs/business-rules.md > Fase 3 > Plano de leitura.

create function public.complete_reading_day(
  p_reading_plan_id uuid,
  p_day_number integer,
  p_date date,
  p_notes text default null
)
returns table (reading_plan_log_row public.reading_plan_logs, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_plan public.reading_plans;
  v_log public.reading_plan_logs;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 10;
begin
  select * into v_plan from public.reading_plans
    where id = p_reading_plan_id and user_id = auth.uid ();

  if not found then
    raise exception 'Plano de leitura não encontrado' using errcode = 'P0002';
  end if;

  insert into public.reading_plan_logs (user_id, reading_plan_id, day_number, date, notes)
  values (auth.uid (), p_reading_plan_id, p_day_number, p_date, p_notes)
  on conflict (reading_plan_id, day_number) do nothing
  returning * into v_log;

  if not found then
    select * into v_log from public.reading_plan_logs
      where reading_plan_id = p_reading_plan_id and day_number = p_day_number and user_id = auth.uid ();
  end if;

  v_source_key := 'READING_PLAN:' || p_reading_plan_id::text || ':' || p_day_number::text;

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'READING_PLAN_DAY_COMPLETED', 'reading_plan_log', v_log.id, v_xp_amount, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_log, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.complete_reading_day (uuid, integer, date, text) from public;
grant execute on function public.complete_reading_day (uuid, integer, date, text) to authenticated;
