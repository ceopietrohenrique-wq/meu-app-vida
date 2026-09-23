-- Fase 7 > Resumo diário e semanal. Ver docs/business-rules.md > Fase 7.
--
-- Resumo diário: reaproveita get_progress_summary(hoje, hoje, user_id) —
-- que já cobre tarefas/hábitos/treino/dieta/água/devocional/leitura/peso —
-- e só soma o que falta (gastos pessoais do dia, vendas do dia), nunca
-- recalcula tudo de novo. Só inclui na mensagem os módulos com dado real
-- (CLAUDE.md > Fase 7 > 10: "não incluir módulos sem dados só para
-- preencher espaço").
--
-- Resumo semanal: reaproveita get_weekly_review_snapshot(week_start,
-- user_id) inteiro — a mesma função da Fase 6, sem nenhuma lógica paralela
-- (CLAUDE.md > Fase 7 > 11).

create function public.generate_daily_summary_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_local_ts timestamp;
  v_local_date date;
  v_summary record;
  v_expenses numeric;
  v_sales_count integer;
  v_sales_revenue numeric;
  v_parts text[];
  v_title text := 'Resumo de hoje';
  v_body text;
  v_key text;
begin
  for v_row in
    select p.id as user_id, p.timezone, np.daily_summary_time,
           np.in_app_enabled, np.push_enabled
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    where np.daily_summary_enabled
  loop
    v_local_ts := now() at time zone v_row.timezone;
    v_local_date := v_local_ts::date;

    if v_local_ts::time < v_row.daily_summary_time then
      continue;
    end if;

    select * into v_summary
      from public.get_progress_summary(v_local_date, v_local_date, v_row.user_id);

    select coalesce(sum(amount), 0) into v_expenses
      from public.finance_transactions
      where user_id = v_row.user_id and context = 'pessoal' and type = 'expense'
        and canceled_at is null and transaction_date = v_local_date;

    select count(*), coalesce(sum(net_amount), 0) into v_sales_count, v_sales_revenue
      from public.sales
      where user_id = v_row.user_id and status = any (array['confirmed', 'paid', 'delivered'])
        and sale_date = v_local_date;

    v_parts := array[]::text[];
    if v_summary.tasks_total > 0 then
      v_parts := array_append(v_parts, v_summary.tasks_completed || '/' || v_summary.tasks_total || ' tarefas');
    end if;
    if v_summary.habit_logs_count > 0 then
      v_parts := array_append(v_parts, v_summary.habit_logs_count || ' hábito(s) registrado(s)');
    end if;
    if v_summary.workouts_completed > 0 then
      v_parts := array_append(v_parts, v_summary.workouts_completed || ' treino(s) concluído(s)');
    end if;
    if v_summary.water_goal_days > 0 then
      v_parts := array_append(v_parts, 'meta de água batida');
    end if;
    if v_summary.devotional_days > 0 then
      v_parts := array_append(v_parts, 'devocional feito');
    end if;
    if v_expenses > 0 then
      v_parts := array_append(v_parts, 'R$ ' || to_char(v_expenses, 'FM999999990.00') || ' em gastos');
    end if;
    if v_sales_count > 0 then
      v_parts := array_append(v_parts, v_sales_count || ' venda(s), R$ ' || to_char(v_sales_revenue, 'FM999999990.00'));
    end if;
    if v_summary.xp_total > 0 then
      v_parts := array_append(v_parts, '+' || v_summary.xp_total || ' XP');
    end if;

    -- Nenhum dado relevante hoje: não manda resumo vazio.
    if array_length(v_parts, 1) is null then
      continue;
    end if;

    v_body := array_to_string(v_parts, ' · ');
    v_key := 'DAILY_SUMMARY:' || v_local_date;

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'DAILY_SUMMARY', v_title, v_body, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, notification_key, title, body, url)
      values (v_row.user_id, 'daily_summary', v_key, v_title, v_body, '/progresso')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.generate_weekly_summary_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_local_date date;
  v_week_start date;
  v_snapshot record;
  v_parts text[];
  v_title text := 'Resumo da semana';
  v_body text;
  v_key text;
begin
  for v_row in
    select p.id as user_id, p.timezone, p.week_start,
           np.in_app_enabled, np.push_enabled
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    where np.weekly_summary_enabled
  loop
    v_local_date := (now() at time zone v_row.timezone)::date;
    v_week_start := public.week_start_date(v_local_date, v_row.week_start);

    -- Só no último dia da semana (a partir das 20h local) — uma vez por
    -- semana, nunca todo dia.
    if v_local_date <> v_week_start + 6
      or extract(hour from now() at time zone v_row.timezone)::integer < 20 then
      continue;
    end if;

    select * into v_snapshot
      from public.get_weekly_review_snapshot(v_week_start, v_row.user_id);

    v_parts := array[]::text[];
    if v_snapshot.tasks_total > 0 then
      v_parts := array_append(v_parts, v_snapshot.tasks_completed || '/' || v_snapshot.tasks_total || ' tarefas');
    end if;
    if v_snapshot.habits_completed > 0 then
      v_parts := array_append(v_parts, v_snapshot.habits_completed || ' hábito(s)');
    end if;
    if v_snapshot.workouts_completed > 0 then
      v_parts := array_append(v_parts, v_snapshot.workouts_completed || ' treino(s)');
    end if;
    if v_snapshot.sales_revenue > 0 then
      v_parts := array_append(v_parts, 'R$ ' || to_char(v_snapshot.sales_revenue, 'FM999999990.00') || ' em vendas');
    end if;
    if v_snapshot.personal_expenses > 0 then
      v_parts := array_append(v_parts, 'R$ ' || to_char(v_snapshot.personal_expenses, 'FM999999990.00') || ' em gastos');
    end if;
    if v_snapshot.xp_earned > 0 then
      v_parts := array_append(v_parts, '+' || v_snapshot.xp_earned || ' XP');
    end if;

    if array_length(v_parts, 1) is null then
      continue;
    end if;

    v_body := array_to_string(v_parts, ' · ');
    v_key := 'WEEKLY_SUMMARY:' || v_week_start;

    if v_row.in_app_enabled then
      insert into public.notifications (user_id, type, title, body, notification_key)
      values (v_row.user_id, 'WEEKLY_SUMMARY', v_title, v_body, v_key)
      on conflict (user_id, notification_key) where (notification_key is not null) do nothing;
    end if;

    if v_row.push_enabled then
      insert into public.scheduled_notifications (user_id, category, notification_key, title, body, url)
      values (v_row.user_id, 'weekly_summary', v_key, v_title, v_body, '/progresso')
      on conflict (user_id, notification_key) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.generate_daily_summary_notifications () from public;
revoke all on function public.generate_weekly_summary_notifications () from public;
grant execute on function public.generate_daily_summary_notifications () to service_role;
grant execute on function public.generate_weekly_summary_notifications () to service_role;

-- Orquestrador único chamado pelo job (Edge Function) — cada gerador
-- continua idempotente/dedup por conta própria; o orquestrador só evita 7
-- chamadas HTTP separadas do lado de fora.
create function public.generate_scheduled_notifications()
returns table (generator text, generated_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select 'task_reminders', public.generate_task_reminders ();
  return query select 'water_reminders', public.generate_water_reminders ();
  return query select 'workout_reminders', public.generate_workout_reminders ();
  return query select 'devotional_reminders', public.generate_devotional_reminders ();
  return query select 'daily_summary', public.generate_daily_summary_notifications ();
  return query select 'weekly_summary', public.generate_weekly_summary_notifications ();
end;
$$;

revoke all on function public.generate_scheduled_notifications () from public;
grant execute on function public.generate_scheduled_notifications () to service_role;
