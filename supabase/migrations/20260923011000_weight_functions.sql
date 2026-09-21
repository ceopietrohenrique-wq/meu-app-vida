-- Saúde > Peso: registrar peso e XP semanal idempotente (ver
-- docs/business-rules.md > Fase 2 > Peso). O produto NUNCA premia
-- diretamente a perda de peso — premia o COMPORTAMENTO de registrar,
-- no máximo uma vez por semana ISO, independente de quantos registros o
-- usuário faça naquela semana.

create function public.log_weight(p_weight_kg numeric, p_date date, p_notes text default null)
returns table (weight_log_row public.weight_logs, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_log public.weight_logs;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 5;
begin
  insert into public.weight_logs (user_id, weight_kg, date, notes)
  values (auth.uid (), p_weight_kg, p_date, p_notes)
  returning * into v_log;

  v_source_key := 'WEIGHT_LOGGED:' || to_char(p_date, 'IYYY"-W"IW');

  insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
  values (auth.uid (), 'WEIGHT_LOGGED', 'weight_log', v_log.id, v_xp_amount, v_source_key)
  on conflict (user_id, source_key) do nothing;

  get diagnostics v_xp_inserted = row_count;

  return query select v_log, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.log_weight (numeric, date, text) from public;
grant execute on function public.log_weight (numeric, date, text) to authenticated;

-- Trocar de meta de peso é uma única operação atômica: desativa a meta
-- ativa anterior (se houver) e cria a nova — nunca duas metas ativas ao
-- mesmo tempo (garantido também pelo índice único parcial da migration
-- anterior).
create function public.set_weight_goal(p_target_weight_kg numeric, p_target_date date default null)
returns public.weight_goals
language plpgsql
as $$
declare
  v_goal public.weight_goals;
begin
  update public.weight_goals
    set is_active = false
    where user_id = auth.uid () and is_active;

  insert into public.weight_goals (user_id, target_weight_kg, target_date, is_active)
  values (auth.uid (), p_target_weight_kg, p_target_date, true)
  returning * into v_goal;

  return v_goal;
end;
$$;

revoke all on function public.set_weight_goal (numeric, date) from public;
grant execute on function public.set_weight_goal (numeric, date) to authenticated;
