-- Fase 7 > Notificações inteligentes + deduplicação. Ver
-- docs/business-rules.md > Fase 7 e SPEC-ORIGINAL.md > NOTIFICAÇÕES
-- INTELIGENTES / DEDUPLICAÇÃO DE NOTIFICAÇÃO.
--
-- Cada gerador roda para TODOS os usuários (job em background, sem sessão
-- — por isso SECURITY DEFINER, revogado de authenticated/anon, só
-- service_role pode chamar). Cada um:
--   1. verifica o ESTADO ATUAL antes de gerar (tarefa já concluída? água já
--      batida? treino já feito? devocional já feito?) — nunca gera uma
--      notificação para algo que já não é mais verdade;
--   2. respeita a preferência de categoria do usuário;
--   3. grava IN_APP imediatamente em `notifications` (Fase 1, mesma tabela,
--      nunca um sistema paralelo) quando in_app_enabled;
--   4. enfileira em `scheduled_notifications` quando push_enabled — o job de
--      envio (20260929010700) revalida de novo no momento do envio
--      (cancelamento lógico) e respeita quiet hours ali, não aqui.
-- Idempotência: notification_key + UNIQUE(user_id, notification_key) em
-- ambas as tabelas — rodar o gerador várias vezes no mesmo dia nunca
-- duplica.

create function public.generate_task_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_local_date date;
  v_key text;
  v_title text;
begin
  for v_row in
    select t.id as task_id, t.title as task_title, t.user_id,
           (now() at time zone p.timezone)::date as local_date,
           np.in_app_enabled, np.push_enabled
    from public.tasks t
    join public.profiles p on p.id = t.user_id
    join public.notification_preferences np on np.user_id = t.user_id
    where np.tasks_enabled
      and t.status not in ('concluida', 'cancelada')
      and t.priority in ('alta', 'critica')
      and t.due_date = (now() at time zone p.timezone)::date
  loop
    v_local_date := v_row.local_date;
    v_key := 'TASK_REMINDER:' || v_row.task_id || ':' || v_local_date;
    v_title := v_row.task_title || ' vence hoje.';

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'TASK_REMINDER', v_title, null, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, entity_id, notification_key, title, url)
      values (v_row.user_id, 'tasks', v_row.task_id, v_key, v_title, '/')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.generate_water_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_key text;
  v_slot text;
  v_local_hour integer;
  v_title text;
begin
  for v_row in
    select p.id as user_id, p.timezone,
           (now() at time zone p.timezone)::date as local_date,
           extract(hour from now() at time zone p.timezone)::integer as local_hour,
           ws.daily_goal_ml,
           coalesce((
             select sum(wl.amount_ml) from public.water_logs wl
             where wl.user_id = p.id and wl.date = (now() at time zone p.timezone)::date
           ), 0) as consumed_ml,
           np.in_app_enabled, np.push_enabled
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    join public.water_settings ws on ws.user_id = p.id
    where np.water_enabled
  loop
    -- Meta já batida hoje: PARAR notificações de água naquele dia
    -- (SPEC-ORIGINAL.md > NOTIFICAÇÕES DE ÁGUA).
    if v_row.consumed_ml >= v_row.daily_goal_ml then
      continue;
    end if;

    -- Só nos horários de check (manhã/tarde/noite) — nunca a cada execução
    -- do job, para não virar spam a cada poucos minutos.
    v_local_hour := v_row.local_hour;
    if v_local_hour between 9 and 11 then
      v_slot := 'morning';
    elsif v_local_hour between 14 and 16 then
      v_slot := 'afternoon';
    elsif v_local_hour between 19 and 20 then
      v_slot := 'evening';
    else
      continue;
    end if;

    v_key := 'WATER_REMINDER:' || v_row.local_date || ':' || v_slot;
    v_title := 'Você está em ' || round(v_row.consumed_ml / 1000.0, 1) || 'L de ' ||
      round(v_row.daily_goal_ml / 1000.0, 1) || 'L hoje.';

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'WATER_REMINDER', v_title, null, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, notification_key, title, url)
      values (v_row.user_id, 'water', v_key, v_title, '/saude')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.generate_workout_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_key text;
  v_title text;
begin
  for v_row in
    select ws.id as session_id, ws.user_id, wp.name as plan_name,
           (now() at time zone p.timezone)::date as local_date,
           np.in_app_enabled, np.push_enabled
    from public.workout_sessions ws
    join public.workout_plans wp on wp.id = ws.workout_plan_id
    join public.profiles p on p.id = ws.user_id
    join public.notification_preferences np on np.user_id = ws.user_id
    where np.workout_enabled
      and ws.completed_at is null
      and ws.date = (now() at time zone p.timezone)::date
  loop
    v_key := 'WORKOUT_REMINDER:' || v_row.session_id || ':' || v_row.local_date;
    v_title := 'Hoje é dia de ' || v_row.plan_name || '.';

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'WORKOUT_REMINDER', v_title, null, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, entity_id, notification_key, title, url)
      values (v_row.user_id, 'workout', v_row.session_id, v_key, v_title, '/saude')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.generate_devotional_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_key text;
  v_title text := 'Seu momento devocional ainda está pendente.';
begin
  for v_row in
    select p.id as user_id, (now() at time zone p.timezone)::date as local_date,
           np.in_app_enabled, np.push_enabled,
           d.read_done, d.reflection_done, d.prayer_done
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    left join public.devotionals d
      on d.user_id = p.id and d.date = (now() at time zone p.timezone)::date
    where np.spiritual_enabled
      and extract(hour from now() at time zone p.timezone)::integer >= 19
  loop
    -- Já concluído (os 3 checks) hoje: não enviar.
    if coalesce(v_row.read_done, false)
      and coalesce(v_row.reflection_done, false)
      and coalesce(v_row.prayer_done, false) then
      continue;
    end if;

    v_key := 'DEVOTIONAL:' || v_row.local_date;

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'DEVOTIONAL', v_title, null, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, notification_key, title, url)
      values (v_row.user_id, 'spiritual', v_key, v_title, '/espiritual')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.generate_task_reminders () from public;
revoke all on function public.generate_water_reminders () from public;
revoke all on function public.generate_workout_reminders () from public;
revoke all on function public.generate_devotional_reminders () from public;
grant execute on function public.generate_task_reminders () to service_role;
grant execute on function public.generate_water_reminders () to service_role;
grant execute on function public.generate_workout_reminders () to service_role;
grant execute on function public.generate_devotional_reminders () to service_role;
