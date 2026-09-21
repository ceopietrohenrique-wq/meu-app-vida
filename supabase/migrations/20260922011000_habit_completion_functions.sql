-- RPCs de conclusão idempotente de hábito. Ver docs/business-rules.md > 1.5.

create function public.complete_habit(p_habit_id uuid, p_date date, p_value numeric default null)
returns table (habit_log_row public.habit_logs, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_habit public.habits;
  v_log public.habit_logs;
  v_source_key text;
  v_xp_inserted integer;
begin
  select * into v_habit from public.habits
    where id = p_habit_id and user_id = auth.uid ();

  if not found then
    raise exception 'Hábito não encontrado' using errcode = 'P0002';
  end if;

  insert into public.habit_logs (user_id, habit_id, date, value)
  values (auth.uid (), p_habit_id, p_date, p_value)
  on conflict (habit_id, date) do nothing
  returning * into v_log;

  if not found then
    select * into v_log from public.habit_logs
      where habit_id = p_habit_id and date = p_date and user_id = auth.uid ();
  end if;

  v_source_key := 'HABIT:' || p_habit_id::text || ':' || p_date::text;

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'HABIT_COMPLETED', 'habit', p_habit_id, v_habit.xp_reward, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_log, (v_xp_inserted > 0), v_habit.xp_reward;
end;
$$;

revoke all on function public.complete_habit (uuid, date, numeric) from public;
grant execute on function public.complete_habit (uuid, date, numeric) to authenticated;

-- Desmarcar remove o log do dia mas nunca revoga XP já concedido
-- (ver docs/business-rules.md > 1.5).
create function public.uncomplete_habit(p_habit_id uuid, p_date date)
returns void
language plpgsql
as $$
begin
  delete from public.habit_logs
    where habit_id = p_habit_id and date = p_date and user_id = auth.uid ();
end;
$$;

revoke all on function public.uncomplete_habit (uuid, date) from public;
grant execute on function public.uncomplete_habit (uuid, date) to authenticated;
