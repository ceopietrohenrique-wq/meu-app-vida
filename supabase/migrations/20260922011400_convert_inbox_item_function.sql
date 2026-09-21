-- Converter item do Inbox em tarefa é uma operação de duas tabelas —
-- precisa ser atômica para nunca deixar o item "processado" sem a tarefa
-- correspondente (ou vice-versa).

create function public.convert_inbox_item_to_task (p_item_id uuid, p_title text)
returns public.tasks
language plpgsql
as $$
declare
  v_item public.inbox_items;
  v_task public.tasks;
begin
  select * into v_item from public.inbox_items
    where id = p_item_id and user_id = auth.uid ();

  if not found then
    raise exception 'Item do inbox não encontrado' using errcode = 'P0002';
  end if;

  insert into public.tasks (title)
  values (p_title)
  returning * into v_task;

  update public.inbox_items
    set status = 'processado', converted_to_type = 'task', converted_to_id = v_task.id
    where id = p_item_id and user_id = auth.uid ();

  return v_task;
end;
$$;

revoke all on function public.convert_inbox_item_to_task (uuid, text) from public;
grant execute on function public.convert_inbox_item_to_task (uuid, text) to authenticated;
