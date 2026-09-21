-- Notificação in-app quando a meta semanal de XP é atingida pela primeira
-- vez naquela semana. Deduplicada por notification_key — nunca repete
-- (ver docs/SPEC-ORIGINAL.md > NOTIFICAÇÕES DE XP e DEDUPLICAÇÃO).

create function public.handle_xp_event_notify_weekly_goal()
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
    on conflict (user_id, notification_key) do nothing;
  end if;

  return new;
end;
$$;

create trigger xp_events_notify_weekly_goal
after insert on public.xp_events
for each row
execute function public.handle_xp_event_notify_weekly_goal ();
