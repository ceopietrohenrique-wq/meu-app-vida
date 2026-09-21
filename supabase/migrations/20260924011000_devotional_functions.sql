-- Espiritual > Devocional: registrar/atualizar o devocional do dia e
-- conceder XP idempotente só quando o checklist completo (leu + refletiu +
-- orou) — XP incentiva constância na prática, não a quantidade de texto
-- escrito. Ver docs/business-rules.md > Fase 3 > Devocional.

create function public.log_devotional(
  p_date date,
  p_passage text default null,
  p_theme text default null,
  p_reflection text default null,
  p_learning text default null,
  p_application text default null,
  p_prayer text default null,
  p_duration_minutes integer default null,
  p_notes text default null,
  p_read_done boolean default false,
  p_reflection_done boolean default false,
  p_prayer_done boolean default false
)
returns table (devotional_row public.devotionals, xp_awarded boolean, xp_amount integer)
language plpgsql
as $$
declare
  v_row public.devotionals;
  v_source_key text;
  v_xp_inserted integer;
  v_xp_amount constant integer := 10;
begin
  insert into public.devotionals (
    user_id, date, passage, theme, reflection, learning, application, prayer,
    duration_minutes, notes, read_done, reflection_done, prayer_done
  )
  values (
    auth.uid (), p_date, p_passage, p_theme, p_reflection, p_learning, p_application, p_prayer,
    p_duration_minutes, p_notes, p_read_done, p_reflection_done, p_prayer_done
  )
  on conflict (user_id, date) do update set
    passage = excluded.passage,
    theme = excluded.theme,
    reflection = excluded.reflection,
    learning = excluded.learning,
    application = excluded.application,
    prayer = excluded.prayer,
    duration_minutes = excluded.duration_minutes,
    notes = excluded.notes,
    read_done = excluded.read_done,
    reflection_done = excluded.reflection_done,
    prayer_done = excluded.prayer_done,
    updated_at = now()
  returning * into v_row;

  if v_row.read_done and v_row.reflection_done and v_row.prayer_done then
    v_source_key := 'DEVOTIONAL:' || p_date::text;

    insert into public.xp_events (user_id, event_type, entity_type, entity_id, xp_amount, source_key)
    values (auth.uid (), 'DEVOTIONAL', 'devotional', v_row.id, v_xp_amount, v_source_key)
    on conflict (user_id, source_key) do nothing;

    get diagnostics v_xp_inserted = row_count;
  else
    v_xp_inserted := 0;
  end if;

  return query select v_row, (v_xp_inserted > 0), v_xp_amount;
end;
$$;

revoke all on function public.log_devotional (
  date, text, text, text, text, text, text, integer, text, boolean, boolean, boolean
) from public;
grant execute on function public.log_devotional (
  date, text, text, text, text, text, text, integer, text, boolean, boolean, boolean
) to authenticated;
