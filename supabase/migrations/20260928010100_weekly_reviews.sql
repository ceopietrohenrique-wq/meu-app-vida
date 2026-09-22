-- Progresso > Revisão semanal. Ver docs/database.md > Fase 6 e
-- docs/business-rules.md > Fase 6.
--
-- Mesmo padrão de `daily_reviews` (Fase 1): a linha guarda um SNAPSHOT
-- (números do momento em que a revisão foi salva) + as respostas de
-- reflexão em texto livre. O snapshot em si é sempre recalculado ao vivo
-- por `get_weekly_review_snapshot` antes de salvar — nunca uma segunda
-- fonte de verdade divergente dos dados reais de cada domínio.

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  week_start date not null,
  xp_earned bigint not null default 0,
  tasks_completed integer not null default 0,
  tasks_total integer not null default 0,
  habits_completed integer not null default 0,
  workouts_completed integer not null default 0,
  meals_adherent integer not null default 0,
  meals_planned integer not null default 0,
  water_goal_days integer not null default 0,
  devotional_days integer not null default 0,
  bible_reading_days integer not null default 0,
  weight_logs_count integer not null default 0,
  personal_expenses numeric not null default 0,
  sales_revenue numeric not null default 0,
  sales_profit numeric not null default 0,
  leads_count integer not null default 0,
  what_worked text,
  what_didnt_work text,
  improvement text,
  next_week_priority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_reviews_user_id_week_start_idx
  on public.weekly_reviews (user_id, week_start);

create trigger weekly_reviews_set_updated_at
before update on public.weekly_reviews
for each row
execute function public.set_updated_at();

alter table public.weekly_reviews enable row level security;

create policy weekly_reviews_select_own
  on public.weekly_reviews for select using (auth.uid () = user_id);

create policy weekly_reviews_insert_own
  on public.weekly_reviews for insert with check (auth.uid () = user_id);

create policy weekly_reviews_update_own
  on public.weekly_reviews for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy weekly_reviews_delete_own
  on public.weekly_reviews for delete using (auth.uid () = user_id);

-- Snapshot calculado ao vivo, mesma filosofia de get_daily_review_snapshot.
-- Vendas/lucro reaproveitam a mesma definição de REVENUE_STATUSES da Fase 5
-- (confirmed/paid/delivered) — nunca uma segunda definição divergente.
create function public.get_weekly_review_snapshot(p_week_start date)
returns table (
  xp_earned bigint,
  tasks_completed integer,
  tasks_total integer,
  habits_completed integer,
  workouts_completed integer,
  meals_adherent integer,
  meals_planned integer,
  water_goal_days integer,
  devotional_days integer,
  bible_reading_days integer,
  weight_logs_count integer,
  personal_expenses numeric,
  sales_revenue numeric,
  sales_profit numeric,
  leads_count integer
)
language plpgsql
stable
as $$
declare
  v_week_end date := p_week_start + 6;
  v_revenue_statuses constant text[] := array['confirmed', 'paid', 'delivered'];
begin
  return query
  select
    coalesce((
      select sum(xp_amount) from public.xp_events
      where user_id = auth.uid ()
        and created_at::date between p_week_start and v_week_end
    ), 0)::bigint,
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_week_start and v_week_end
        and status = 'concluida'),
    (select count(*)::integer from public.tasks
      where user_id = auth.uid () and due_date between p_week_start and v_week_end
        and status <> 'cancelada'),
    (select count(*)::integer from public.habit_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(*)::integer from public.workout_sessions
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and completed_at is not null),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and status = 'realizada'),
    (select count(*)::integer from public.meal_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(distinct date)::integer from public.water_logs wl
      where wl.user_id = auth.uid () and wl.date between p_week_start and v_week_end
        and (
          select coalesce(sum(w2.amount_ml), 0) from public.water_logs w2
          where w2.user_id = wl.user_id and w2.date = wl.date
        ) >= (select daily_goal_ml from public.water_settings where user_id = auth.uid ())),
    (select count(*)::integer from public.devotionals
      where user_id = auth.uid () and date between p_week_start and v_week_end
        and read_done and reflection_done and prayer_done),
    (select count(distinct date)::integer from public.reading_plan_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    (select count(*)::integer from public.weight_logs
      where user_id = auth.uid () and date between p_week_start and v_week_end),
    coalesce((
      select sum(amount) from public.finance_transactions
      where user_id = auth.uid () and context = 'pessoal' and type = 'expense'
        and canceled_at is null
        and transaction_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount) from public.sales
      where user_id = auth.uid () and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    coalesce((
      select sum(net_amount - direct_costs) from public.sales
      where user_id = auth.uid () and status = any (v_revenue_statuses)
        and sale_date between p_week_start and v_week_end
    ), 0),
    (select count(*)::integer from public.customers
      where user_id = auth.uid () and created_at::date between p_week_start and v_week_end);
end;
$$;

revoke all on function public.get_weekly_review_snapshot (date) from public;
grant execute on function public.get_weekly_review_snapshot (date) to authenticated;
