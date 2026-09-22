-- Auditoria final Fase 6 > item 1: bug real introduzido na correção de
-- timezone anterior (20260928020100_fix_progress_timezone.sql).
--
-- get_xp_trend virou `language plpgsql` (precisa de v_tz), mas o `sum(xp_amount)`
-- ficou ambíguo: plpgsql não sabe se `xp_amount` é a coluna de
-- public.xp_events ou o nome da coluna de retorno da própria função
-- (RETURNS TABLE (day date, xp_amount bigint) cria uma variável implícita
-- xp_amount no escopo da função). Corrigido qualificando a tabela com
-- alias (xe.xp_amount) — mesmo problema não existe nas outras RPCs porque
-- nenhuma delas tem uma coluna de retorno com o mesmo nome de uma coluna
-- de xp_events.

create or replace function public.get_xp_trend(
  p_period_start date,
  p_period_end date
)
returns table (day date, xp_amount bigint)
language plpgsql
stable
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.profiles where id = auth.uid ();

  return query
  select (xe.created_at at time zone v_tz)::date as day, sum(xe.xp_amount)::bigint
  from public.xp_events xe
  where xe.user_id = auth.uid ()
    and (xe.created_at at time zone v_tz)::date between p_period_start and p_period_end
  group by (xe.created_at at time zone v_tz)::date
  order by (xe.created_at at time zone v_tz)::date;
end;
$$;
