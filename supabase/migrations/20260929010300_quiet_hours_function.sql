-- Fase 7 > Horário silencioso. Ver docs/business-rules.md > Fase 7.
--
-- Função pura (sem leitura de tabela) para facilitar teste direto: recebe o
-- horário local já resolvido (perfil.timezone já aplicado pelo chamador) e
-- os limites configurados. Cobre o caso de cruzar a meia-noite (start > end)
-- e o caso normal (start < end) com a mesma expressão.
create function public.is_within_quiet_hours(
  p_local_time time,
  p_quiet_start time,
  p_quiet_end time
)
returns boolean
language sql
immutable
as $$
  select case
    when p_quiet_start = p_quiet_end then false
    when p_quiet_start < p_quiet_end then
      p_local_time >= p_quiet_start and p_local_time < p_quiet_end
    else
      p_local_time >= p_quiet_start or p_local_time < p_quiet_end
  end;
$$;

comment on function public.is_within_quiet_hours is
  'start = end desliga o horário silencioso (nunca bloqueia tudo por engano). start > end cruza a meia-noite (ex.: 22:00 -> 07:00).';

-- Wrapper que resolve o horário local do usuário (profiles.timezone) e as
-- preferências (notification_preferences.quiet_hours_*) — usado pelo job de
-- envio para decidir se um push não-crítico deve esperar.
create function public.user_is_in_quiet_hours(p_user_id uuid, p_at timestamptz default now())
returns boolean
language plpgsql
stable
as $$
declare
  v_tz text;
  v_enabled boolean;
  v_start time;
  v_end time;
  v_local_time time;
begin
  select p.timezone, np.quiet_hours_enabled, np.quiet_hours_start, np.quiet_hours_end
    into v_tz, v_enabled, v_start, v_end
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    where p.id = p_user_id;

  if not found or not v_enabled then
    return false;
  end if;

  v_local_time := (p_at at time zone v_tz)::time;
  return public.is_within_quiet_hours(v_local_time, v_start, v_end);
end;
$$;

revoke all on function public.user_is_in_quiet_hours (uuid, timestamptz) from public;
grant execute on function public.user_is_in_quiet_hours (uuid, timestamptz) to service_role;
