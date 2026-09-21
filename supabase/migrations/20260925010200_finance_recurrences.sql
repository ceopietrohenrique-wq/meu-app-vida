-- Financeiro > Recorrências. Ver docs/database.md > Fase 4 >
-- finance_recurrences. Define só a REGRA (assinatura/parcela/conta
-- recorrente); as ocorrências viram linhas próprias em finance_transactions,
-- geradas por generate_finance_recurrence_occurrences() — nunca sobrescritas
-- (mesmo padrão de task_recurrences na Fase 1).

create table public.finance_recurrences (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  context text not null check (context in ('pessoal', 'empresarial')),
  account_id uuid not null references public.finance_accounts (id) on delete cascade,
  category_id uuid references public.finance_categories (id) on delete set null,
  payment_method text,
  amount numeric not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  starts_on date not null,
  ends_on date,
  total_installments integer check (total_installments is null or total_installments > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.finance_recurrences.day_of_month is
  'Dia do mês (1-31). Meses mais curtos usam o último dia do mês (ex.: 31 em fevereiro vira 28/29) — ver generate_finance_recurrence_occurrences.';
comment on column public.finance_recurrences.total_installments is
  'Null = recorrência sem fim por quantidade (ex.: assinatura). Preenchido = parcelamento com fim definido (ex.: 12x).';

create index finance_recurrences_user_id_idx on public.finance_recurrences (user_id);

create trigger finance_recurrences_set_updated_at
before update on public.finance_recurrences
for each row
execute function public.set_updated_at();

alter table public.finance_recurrences enable row level security;

create policy finance_recurrences_select_own
  on public.finance_recurrences for select using (auth.uid () = user_id);

create policy finance_recurrences_insert_own
  on public.finance_recurrences for insert with check (auth.uid () = user_id);

create policy finance_recurrences_update_own
  on public.finance_recurrences for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy finance_recurrences_delete_own
  on public.finance_recurrences for delete using (auth.uid () = user_id);
