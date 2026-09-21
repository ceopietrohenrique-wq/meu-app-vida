-- Financeiro > Transações. Ver docs/database.md > Fase 4 >
-- finance_transactions e docs/business-rules.md > Fase 4.
--
-- amount é SEMPRE positivo (check) — o efeito no saldo depende do `type`,
-- nunca do sinal do valor armazenado (CLAUDE.md > Fase 4 > 3). Transferência
-- é UMA linha com account_id (origem) + transfer_account_id (destino), nunca
-- duas linhas de income/expense — isso é o que impede "transferências
-- duplicarem receita/despesa".
--
-- "Cancelar" uma transação é soft-delete via canceled_at (nunca DELETE físico
-- nem edição que perderia histórico): o saldo é sempre calculado excluindo
-- canceled_at is not null, então cancelar/editar nunca deixa o saldo
-- inconsistente — não existe coluna de saldo denormalizada para reconciliar.

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  account_id uuid not null references public.finance_accounts (id) on delete restrict,
  type text not null check (type in ('income', 'expense', 'transfer')),
  context text not null check (context in ('pessoal', 'empresarial')),
  amount numeric not null check (amount > 0),
  description text,
  category_id uuid references public.finance_categories (id) on delete set null,
  transaction_date date not null,
  payment_method text,
  -- business_id/sale_id: mesma lógica de tasks.project_id na Fase 1 — as
  -- tabelas `businesses`/`sales` só existem na Fase 5, mas a coluna já nasce
  -- aqui para não exigir migration destrutiva depois. Sem FK proposital.
  business_id uuid,
  sale_id uuid,
  transfer_account_id uuid references public.finance_accounts (id) on delete restrict,
  recurrence_id uuid references public.finance_recurrences (id) on delete set null,
  notes text,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id)
    or (type <> 'transfer' and transfer_account_id is null)
  )
);

create index finance_transactions_user_id_date_idx
  on public.finance_transactions (user_id, transaction_date);
create index finance_transactions_user_id_account_id_idx
  on public.finance_transactions (user_id, account_id);
create index finance_transactions_user_id_category_id_idx
  on public.finance_transactions (user_id, category_id);

-- Idempotência da geração de recorrência: o mesmo dia do mesmo plano nunca
-- gera duas ocorrências (mesmo padrão de UNIQUE(recurrence_id, due_date) de
-- task_recurrences).
create unique index finance_transactions_recurrence_date_unique
  on public.finance_transactions (recurrence_id, transaction_date)
  where recurrence_id is not null;

create trigger finance_transactions_set_updated_at
before update on public.finance_transactions
for each row
execute function public.set_updated_at();

-- Defesa em profundidade: impede que account_id/transfer_account_id/
-- category_id apontem para uma conta/categoria de OUTRO usuário (a FK sozinha
-- não valida ownership, só existência da linha). Não vaza dado de outro
-- usuário (RLS de finance_accounts/finance_categories continua isolando a
-- leitura), só bloqueia uma referência cruzada inválida na escrita.
create function public.finance_transactions_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.finance_accounts
    where id = new.account_id and user_id = new.user_id
  ) then
    raise exception 'Conta inválida para este usuário.';
  end if;

  if new.transfer_account_id is not null and not exists (
    select 1 from public.finance_accounts
    where id = new.transfer_account_id and user_id = new.user_id
  ) then
    raise exception 'Conta de destino inválida para este usuário.';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.finance_categories
    where id = new.category_id and user_id = new.user_id
  ) then
    raise exception 'Categoria inválida para este usuário.';
  end if;

  return new;
end;
$$;

create trigger finance_transactions_validate_ownership
before insert or update on public.finance_transactions
for each row
execute function public.finance_transactions_validate_ownership();

alter table public.finance_transactions enable row level security;

create policy finance_transactions_select_own
  on public.finance_transactions for select using (auth.uid () = user_id);

create policy finance_transactions_insert_own
  on public.finance_transactions for insert with check (auth.uid () = user_id);

create policy finance_transactions_update_own
  on public.finance_transactions for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy finance_transactions_delete_own
  on public.finance_transactions for delete using (auth.uid () = user_id);
