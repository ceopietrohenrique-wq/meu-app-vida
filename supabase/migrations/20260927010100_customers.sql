-- Negócios > Clientes/Leads e pipeline. Ver docs/database.md > Fase 5 e
-- docs/business-rules.md > Fase 5.
--
-- Um "lead" e um "cliente" são a MESMA entidade em estágios diferentes do
-- pipeline (`stage`) — CRM enxuto de propósito (CLAUDE.md > Fase 5 > 2: "Não
-- criar CRM excessivamente complexo"), nunca duas tabelas separadas que
-- precisariam de "conversão" de lead→cliente.
--
-- "Próxima ação" fica em colunas na própria linha (não uma tabela à parte):
-- um cliente ativo tem NO MÁXIMO uma próxima ação pendente por vez — a
-- fonte única que o Dashboard/Hoje vai consumir no futuro, sem duplicar
-- dado (CLAUDE.md > Fase 5 > 3).

create table public.customers (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  business_id uuid references public.businesses (id) on delete set null,
  name text not null,
  company text,
  phone text,
  whatsapp text,
  instagram text,
  email text,
  segment text,
  city text,
  notes text,
  stage text not null default 'possivel_cliente' check (
    stage in (
      'possivel_cliente', 'contato_feito', 'interessado',
      'proposta_enviada', 'negociacao', 'fechado', 'perdido'
    )
  ),
  next_action text,
  next_action_date date,
  next_action_time time,
  next_action_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_user_id_idx on public.customers (user_id);
create index customers_user_id_stage_idx on public.customers (user_id, stage);
create index customers_user_id_next_action_date_idx
  on public.customers (user_id, next_action_date)
  where next_action_date is not null;

create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

create function public.customers_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.businesses
    where id = new.business_id and user_id = new.user_id
  ) then
    raise exception 'Negócio inválido para este usuário.';
  end if;

  return new;
end;
$$;

create trigger customers_validate_ownership
before insert or update on public.customers
for each row
execute function public.customers_validate_ownership();

alter table public.customers enable row level security;

create policy customers_select_own
  on public.customers for select using (auth.uid () = user_id);

create policy customers_insert_own
  on public.customers for insert with check (auth.uid () = user_id);

create policy customers_update_own
  on public.customers for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy customers_delete_own
  on public.customers for delete using (auth.uid () = user_id);

-- Histórico de interações — imutável (sem UPDATE/DELETE): o histórico de
-- contato com um cliente nunca é "corrigido" in-place, só cresce.
create table public.customer_interactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  customer_id uuid not null references public.customers (id) on delete cascade,
  type text not null check (
    type in ('ligacao', 'whatsapp', 'instagram', 'visita', 'email', 'proposta', 'nota')
  ),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index customer_interactions_customer_id_idx
  on public.customer_interactions (customer_id, occurred_at desc);

create function public.customer_interactions_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.customers
    where id = new.customer_id and user_id = new.user_id
  ) then
    raise exception 'Cliente inválido para este usuário.';
  end if;

  return new;
end;
$$;

create trigger customer_interactions_validate_ownership
before insert or update on public.customer_interactions
for each row
execute function public.customer_interactions_validate_ownership();

alter table public.customer_interactions enable row level security;

create policy customer_interactions_select_own
  on public.customer_interactions for select using (auth.uid () = user_id);

create policy customer_interactions_insert_own
  on public.customer_interactions for insert with check (auth.uid () = user_id);

create policy customer_interactions_delete_own
  on public.customer_interactions for delete using (auth.uid () = user_id);
