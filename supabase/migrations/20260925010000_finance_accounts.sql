-- Financeiro > Contas. Ver docs/database.md > Fase 4 > finance_accounts.
--
-- Saldo NUNCA é uma coluna mutável aqui (mesma filosofia de streaks/volume
-- de treino calculados, não armazenados): é sempre derivado de
-- initial_balance + transações via get_finance_accounts_with_balance().

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  type text not null check (type in ('carteira', 'conta_bancaria', 'cartao', 'caixa_empresa', 'outra')),
  initial_balance numeric not null default 0,
  is_active boolean not null default true,
  context text not null check (context in ('pessoal', 'empresarial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.finance_accounts.initial_balance is
  'Saldo inicial opcional (default 0), ponto de partida para o cálculo de saldo — nunca sobrescrito por transações.';

create index finance_accounts_user_id_idx on public.finance_accounts (user_id);

create trigger finance_accounts_set_updated_at
before update on public.finance_accounts
for each row
execute function public.set_updated_at();

alter table public.finance_accounts enable row level security;

create policy finance_accounts_select_own
  on public.finance_accounts for select using (auth.uid () = user_id);

create policy finance_accounts_insert_own
  on public.finance_accounts for insert with check (auth.uid () = user_id);

create policy finance_accounts_update_own
  on public.finance_accounts for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy finance_accounts_delete_own
  on public.finance_accounts for delete using (auth.uid () = user_id);
