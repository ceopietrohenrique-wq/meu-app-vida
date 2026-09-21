-- Saúde > Treino: iniciar sessão, registrar série e concluir treino com XP
-- idempotente (ver docs/business-rules.md > Fase 2 > Treino). Concluir o
-- treino é a única ação que gera XP — iniciar sessão e registrar séries não
-- geram XP por si só, para não incentivar "abrir e fechar" repetidamente.

create function public.start_workout_session(p_workout_plan_id uuid, p_date date)
returns public.workout_sessions
language plpgsql
as $$
declare
  v_session public.workout_sessions;
begin
  if p_workout_plan_id is not null then
    perform 1 from public.workout_plans
      where id = p_workout_plan_id and user_id = auth.uid ();
    if not found then
      raise exception 'Plano de treino não encontrado' using errcode = 'P0002';
    end if;
  end if;

  insert into public.workout_sessions (user_id, workout_plan_id, date)
  values (auth.uid (), p_workout_plan_id, p_date)
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.start_workout_session (uuid, date) from public;
grant execute on function public.start_workout_session (uuid, date) to authenticated;

create function public.log_exercise_set(
  p_workout_session_id uuid,
  p_workout_exercise_id uuid,
  p_set_order integer,
  p_load_kg numeric,
  p_reps integer
)
returns public.exercise_sets
language plpgsql
as $$
declare
  v_set public.exercise_sets;
begin
  perform 1 from public.workout_sessions
    where id = p_workout_session_id and user_id = auth.uid () and completed_at is null;
  if not found then
    raise exception 'Sessão de treino não encontrada ou já concluída' using errcode = 'P0002';
  end if;

  perform 1 from public.workout_exercises
    where id = p_workout_exercise_id and user_id = auth.uid ();
  if not found then
    raise exception 'Exercício não encontrado' using errcode = 'P0002';
  end if;

  insert into public.exercise_sets (
    user_id, workout_session_id, workout_exercise_id, set_order, load_kg, reps
  )
  values (auth.uid (), p_workout_session_id, p_workout_exercise_id, p_set_order, p_load_kg, p_reps)
  returning * into v_set;

  return v_set;
end;
$$;

revoke all on function public.log_exercise_set (uuid, uuid, integer, numeric, integer) from public;
grant execute on function public.log_exercise_set (uuid, uuid, integer, numeric, integer) to authenticated;

create function public.complete_workout_session(p_workout_session_id uuid)
returns table (workout_session_row public.workout_sessions, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_session public.workout_sessions;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 30;
begin
  select * into v_session from public.workout_sessions
    where id = p_workout_session_id and user_id = auth.uid ();

  if not found then
    raise exception 'Sessão de treino não encontrada' using errcode = 'P0002';
  end if;

  if v_session.completed_at is null then
    update public.workout_sessions
      set completed_at = now()
      where id = p_workout_session_id
      returning * into v_session;
  end if;

  v_source_key := 'WORKOUT_COMPLETED:' || p_workout_session_id::text;

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'WORKOUT_COMPLETED', 'workout_session', p_workout_session_id, v_xp_amount, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_session, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.complete_workout_session (uuid) from public;
grant execute on function public.complete_workout_session (uuid) to authenticated;
