-- Fase 7 > Seleção/envio/registro de resultado — separados em 3 passos
-- (CLAUDE.md > Fase 7 > 9), cada um uma função própria, todas
-- SECURITY DEFINER restritas a service_role (o browser NUNCA chama estas
-- funções nem vê a service_role key — ela só existe na Edge Function).
--
-- 1. select_due_push_notifications: revalida estado (cancelamento lógico),
--    filtra quiet hours, tranca (locked_at) e devolve as linhas prontas
--    para envio real (feito em código, fora do Postgres — Web Push exige
--    HTTP + assinatura VAPID, não dá pra fazer em SQL puro).
-- 2. mark_push_notification_sent / mark_push_notification_failed: registram
--    o resultado depois do envio de verdade.
-- 3. deactivate_push_subscription: chamada quando o push service confirma
--    endpoint inválido/expirado (404/410) — nunca em erro transitório.

create function public.select_due_push_notifications(p_limit integer default 50)
returns setof public.scheduled_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  -- Cancelamento lógico: revalida o estado de cada pendência ANTES de
  -- devolver para envio. Se a atividade já foi concluída depois que o job
  -- gerou a notificação, cancela em vez de enviar desatualizado.
  for v_row in
    select sn.id, sn.category, sn.entity_id, sn.user_id
    from public.scheduled_notifications sn
    where sn.status = 'pending' and sn.scheduled_for <= now()
  loop
    if v_row.category = 'tasks' and v_row.entity_id is not null then
      if exists (
        select 1 from public.tasks
        where id = v_row.entity_id and status in ('concluida', 'cancelada')
      ) then
        update public.scheduled_notifications
          set status = 'cancelled', cancelled_at = now()
          where id = v_row.id;
        continue;
      end if;
    elsif v_row.category = 'workout' and v_row.entity_id is not null then
      if exists (
        select 1 from public.workout_sessions
        where id = v_row.entity_id and completed_at is not null
      ) then
        update public.scheduled_notifications
          set status = 'cancelled', cancelled_at = now()
          where id = v_row.id;
        continue;
      end if;
    elsif v_row.category = 'water' then
      if exists (
        select 1 from public.water_settings ws
        where ws.user_id = v_row.user_id
          and coalesce((
            select sum(wl.amount_ml) from public.water_logs wl
            where wl.user_id = v_row.user_id and wl.date = (now() at time zone (
              select timezone from public.profiles where id = v_row.user_id
            ))::date
          ), 0) >= ws.daily_goal_ml
      ) then
        update public.scheduled_notifications
          set status = 'cancelled', cancelled_at = now()
          where id = v_row.id;
        continue;
      end if;
    elsif v_row.category = 'spiritual' then
      if exists (
        select 1 from public.devotionals
        where user_id = v_row.user_id
          and date = (now() at time zone (select timezone from public.profiles where id = v_row.user_id))::date
          and read_done and reflection_done and prayer_done
      ) then
        update public.scheduled_notifications
          set status = 'cancelled', cancelled_at = now()
          where id = v_row.id;
        continue;
      end if;
    end if;
    -- daily_summary/weekly_summary: sem condição de cancelamento — uma vez
    -- devido, o resumo continua relevante (não fica "desatualizado" da
    -- mesma forma que um lembrete de ação pendente).
  end loop;

  -- Retorna o que sobrou (ainda pending), fora de quiet hours, até o
  -- limite — e tranca (locked_at) para dois workers concorrentes nunca
  -- pegarem a mesma linha.
  return query
  update public.scheduled_notifications sn
    set locked_at = now()
    where sn.id in (
      select id from public.scheduled_notifications
      where status = 'pending'
        and scheduled_for <= now()
        and locked_at is null
        and attempt_count < 5
        and not public.user_is_in_quiet_hours (user_id)
      order by scheduled_for
      limit p_limit
    )
    returning sn.*;
end;
$$;

revoke all on function public.select_due_push_notifications (integer) from public;
grant execute on function public.select_due_push_notifications (integer) to service_role;

create function public.mark_push_notification_sent(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.scheduled_notifications
    set status = 'sent', sent_at = now(), locked_at = null
    where id = p_id;
$$;

create function public.mark_push_notification_failed(p_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  update public.scheduled_notifications
    set attempt_count = attempt_count + 1,
        last_error = p_error,
        locked_at = null,
        -- Esgotou as tentativas (5, mesmo limite do select acima): estado
        -- terminal 'failed', nunca mais tentado de novo (sem loop infinito).
        status = case when attempt_count + 1 >= 5 then 'failed' else status end,
        failed_at = case when attempt_count + 1 >= 5 then now() else failed_at end
    where id = p_id
    returning attempt_count into v_attempts;
end;
$$;

revoke all on function public.mark_push_notification_sent (uuid) from public;
revoke all on function public.mark_push_notification_failed (uuid, text) from public;
grant execute on function public.mark_push_notification_sent (uuid) to service_role;
grant execute on function public.mark_push_notification_failed (uuid, text) to service_role;

-- Desativação de subscription inválida/expirada. is_active=false, NUNCA
-- DELETE — preserva histórico (CLAUDE.md > Fase 7 > 13: não apagar
-- subscription automaticamente em erro transitório; só desativar quando
-- confirmado inválido).
create function public.deactivate_push_subscription(p_subscription_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions
    set is_active = false
    where id = p_subscription_id;
$$;

revoke all on function public.deactivate_push_subscription (uuid) from public;
grant execute on function public.deactivate_push_subscription (uuid) to service_role;
