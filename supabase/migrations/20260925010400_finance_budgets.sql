-- Financeiro > Orçamentos e Alertas. Ver docs/database.md > Fase 4 >
-- finance_budgets/finance_budget_alerts e docs/business-rules.md > Fase 4.
--
-- period_month é sempre normalizado para o primeiro dia do mês (check),
-- permitindo UNIQUE(user_id, category_id, period_month) — um orçamento por
-- categoria por mês.

create table public.finance_budgets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  category_id uuid not null references public.finance_categories (id) on delete cascade,
  context text not null check (context in ('pessoal', 'empresarial')),
  period_month date not null check (period_month = date_trunc('month', period_month)::date),
  planned_amount numeric not null check (planned_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period_month)
);

create index finance_budgets_user_id_period_idx
  on public.finance_budgets (user_id, period_month);

create trigger finance_budgets_set_updated_at
before update on public.finance_budgets
for each row
execute function public.set_updated_at();

alter table public.finance_budgets enable row level security;

create policy finance_budgets_select_own
  on public.finance_budgets for select using (auth.uid () = user_id);

create policy finance_budgets_insert_own
  on public.finance_budgets for insert with check (auth.uid () = user_id);

create policy finance_budgets_update_own
  on public.finance_budgets for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy finance_budgets_delete_own
  on public.finance_budgets for delete using (auth.uid () = user_id);

-- Deduplicação de alertas: registra que um threshold já foi notificado
-- naquele orçamento/período, para o trigger de finance_transactions nunca
-- notificar duas vezes o mesmo cruzamento (CLAUDE.md > Fase 4 > 8).
create table public.finance_budget_alerts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  budget_id uuid not null references public.finance_budgets (id) on delete cascade,
  threshold_percent smallint not null check (threshold_percent in (80, 90, 100)),
  period_month date not null,
  notified_at timestamptz not null default now(),
  unique (budget_id, threshold_percent, period_month)
);

alter table public.finance_budget_alerts enable row level security;

create policy finance_budget_alerts_select_own
  on public.finance_budget_alerts for select using (auth.uid () = user_id);

-- Insert só acontece via trigger disparado pela própria transação do
-- usuário (finance_check_budget_alerts) — mas RLS ainda vale para esse
-- INSERT (roda com o papel de quem disparou a transação), então a policy é
-- necessária mesmo sem nenhum client chamando insert diretamente.
create policy finance_budget_alerts_insert_own
  on public.finance_budget_alerts for insert with check (auth.uid () = user_id);

-- Sem policy de UPDATE/DELETE: histórico de alertas é imutável.
