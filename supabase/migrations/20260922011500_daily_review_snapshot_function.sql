-- Snapshot do encerramento do dia: tarefas do dia, concluídas e XP ganho
-- naquele dia local do usuário. Mesma abordagem de get_weekly_xp_summary —
-- um único lugar calcula "dia local", nunca duplicado em JS.

create function public.get_daily_review_snapshot (p_date date)
returns table (tasks_total integer, tasks_completed integer, xp_earned bigint)
language plpgsql
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = auth.uid ();

  if not found then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  return query
  select
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date = p_date and status <> 'cancelada'),
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date = p_date and status = 'concluida'),
    coalesce((select sum(xp_amount) from public.xp_events
      where user_id = auth.uid ()
        and (created_at at time zone v_tz)::date = p_date), 0)::bigint;
end;
$$;

revoke all on function public.get_daily_review_snapshot (date) from public;
grant execute on function public.get_daily_review_snapshot (date) to authenticated;
