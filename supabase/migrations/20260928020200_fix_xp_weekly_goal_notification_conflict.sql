-- Auditoria final Fase 6 > item 3 (achado colateral, não é regra nova de
-- Fase 6): bug real e pré-existente na Fase 1
-- (20260922011100_xp_weekly_goal_notification.sql), descoberto ao testar
-- resgate de recompensa com XP suficiente (grant de 500 XP de uma vez, que
-- cruza o weekly_xp_goal padrão de 500).
--
-- O trigger `xp_events_notify_weekly_goal` fazia
-- `on conflict (user_id, notification_key) do nothing`, mas o índice único
-- de `notifications` é PARCIAL (`where notification_key is not null` — ver
-- 20260922010600_notifications.sql). Um ON CONFLICT sem o predicado
-- correspondente não casa com um índice parcial: Postgres recusa com
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" (42P10). Como o trigger roda DEPOIS do INSERT em
-- xp_events, na MESMA transação, esse erro abortava o INSERT inteiro — ou
-- seja, qualquer concessão de XP que fizesse o total semanal cruzar a meta
-- falhava por completo (XP nem chegava a ser gravado). Bug de baseline
-- (commit bf279e7), não uma regra nova — corrigido aqui por bloquear
-- diretamente o funcionamento correto de XP/recompensas auditado nesta
-- fase (CLAUDE.md > prioridade: funcionamento correto acima de
-- simplicidade/não-alterar-fases-anteriores).

create or replace function public.handle_xp_event_notify_weekly_goal()
returns trigger
language plpgsql
as $$
declare
  v_week_start smallint;
  v_goal integer;
  v_tz text;
  v_local_date date;
  v_week_start_date date;
  v_total_after numeric;
  v_total_before numeric;
begin
  select week_start, weekly_xp_goal, timezone
    into v_week_start, v_goal, v_tz
    from public.profiles
    where id = new.user_id;

  if v_goal is null or v_goal <= 0 then
    return new;
  end if;

  v_local_date := (new.created_at at time zone v_tz)::date;
  v_week_start_date := public.week_start_date(v_local_date, v_week_start);

  select coalesce(sum(xp_amount), 0)
    into v_total_after
    from public.xp_events
    where user_id = new.user_id
      and (created_at at time zone v_tz)::date >= v_week_start_date
      and (created_at at time zone v_tz)::date < v_week_start_date + 7;

  v_total_before := v_total_after - new.xp_amount;

  if v_total_before < v_goal and v_total_after >= v_goal then
    insert into public.notifications (user_id, type, title, body, notification_key)
    values (
      new.user_id,
      'XP_WEEKLY_GOAL',
      'Meta semanal concluída.',
      format('Você atingiu %s XP esta semana.', v_total_after),
      'XP_WEEKLY_GOAL:' || v_week_start_date::text
    )
    on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
  end if;

  return new;
end;
$$;
