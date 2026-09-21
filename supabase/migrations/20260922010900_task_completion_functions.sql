-- RPCs de conclusão idempotente de tarefa. Ver docs/business-rules.md > 1.3.
--
-- Rodam como SECURITY INVOKER (padrão): a RLS de tasks/xp_events continua
-- valendo dentro da função, então a proteção contra acesso cruzado entre
-- usuários é a mesma de qualquer outra query — não é um bypass.

create function public.complete_task(p_task_id uuid)
returns table (task_row public.tasks, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_task public.tasks;
  v_source_key text;
  v_xp_inserted integer;
begin
  update public.tasks
    set status = 'concluida', completed_at = now()
    where id = p_task_id
      and user_id = auth.uid ()
      and status <> 'concluida'
    returning * into v_task;

  if not found then
    select * into v_task from public.tasks
      where id = p_task_id and user_id = auth.uid ();

    if not found then
      raise exception 'Tarefa não encontrada' using errcode = 'P0002';
    end if;

    -- Já estava concluída (double-submit ou remarcação): idempotente, sem
    -- novo XP.
    return query select v_task, false, 0;
    return;
  end if;

  v_source_key := 'TASK_COMPLETED:' || p_task_id::text;

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'TASK_COMPLETED', 'task', p_task_id, v_task.xp_reward, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_task, (v_xp_inserted > 0), v_task.xp_reward;
end;
$$;

revoke all on function public.complete_task (uuid) from public;
grant execute on function public.complete_task (uuid) to authenticated;

-- Desmarcar nunca revoga XP já concedido (ver docs/business-rules.md > 1.4).
create function public.uncomplete_task(p_task_id uuid)
returns public.tasks
language plpgsql
as $$
declare
  v_task public.tasks;
begin
  update public.tasks
    set status = 'pendente', completed_at = null
    where id = p_task_id and user_id = auth.uid ()
    returning * into v_task;

  if not found then
    raise exception 'Tarefa não encontrada' using errcode = 'P0002';
  end if;

  return v_task;
end;
$$;

revoke all on function public.uncomplete_task (uuid) from public;
grant execute on function public.uncomplete_task (uuid) to authenticated;
