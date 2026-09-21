-- Auditoria Fase 4 > item 7: "conta pessoal/empresarial não pode ser
-- misturada acidentalmente" e "categoria pessoal não pode ser usada
-- indevidamente em transação empresarial". Regra definida: o `context` de
-- uma transação/recorrência/orçamento precisa ser IGUAL ao `context` de
-- toda conta/categoria que ela referencia — nunca uma transação
-- "empresarial" usando uma conta ou categoria "pessoal" (ou vice-versa).
--
-- Estende a validação de ownership que já existia só para
-- finance_transactions, e adiciona a mesma defesa (ownership + contexto)
-- para finance_recurrences e finance_budgets, que ainda não tinham nenhuma
-- validação além da RLS (risco documentado e agora fechado em
-- docs/architecture.md).

create or replace function public.finance_transactions_validate_ownership()
returns trigger
language plpgsql
as $$
declare
  v_account_context text;
  v_category_context text;
begin
  select context into v_account_context
    from public.finance_accounts
    where id = new.account_id and user_id = new.user_id;

  if v_account_context is null then
    raise exception 'Conta inválida para este usuário.';
  end if;

  if v_account_context <> new.context then
    raise exception 'A conta % é do contexto %, mas a transação é %.',
      new.account_id, v_account_context, new.context;
  end if;

  if new.transfer_account_id is not null then
    select context into v_account_context
      from public.finance_accounts
      where id = new.transfer_account_id and user_id = new.user_id;

    if v_account_context is null then
      raise exception 'Conta de destino inválida para este usuário.';
    end if;

    if v_account_context <> new.context then
      raise exception 'A conta de destino % é do contexto %, mas a transação é %.',
        new.transfer_account_id, v_account_context, new.context;
    end if;
  end if;

  if new.category_id is not null then
    select context into v_category_context
      from public.finance_categories
      where id = new.category_id and user_id = new.user_id;

    if v_category_context is null then
      raise exception 'Categoria inválida para este usuário.';
    end if;

    if v_category_context <> new.context then
      raise exception 'A categoria % é do contexto %, mas a transação é %.',
        new.category_id, v_category_context, new.context;
    end if;
  end if;

  return new;
end;
$$;

-- finance_recurrences: mesma defesa (ownership + contexto) para
-- account_id/category_id.
create function public.finance_recurrences_validate_ownership()
returns trigger
language plpgsql
as $$
declare
  v_account_context text;
  v_category_context text;
begin
  select context into v_account_context
    from public.finance_accounts
    where id = new.account_id and user_id = new.user_id;

  if v_account_context is null then
    raise exception 'Conta inválida para este usuário.';
  end if;

  if v_account_context <> new.context then
    raise exception 'A conta % é do contexto %, mas a recorrência é %.',
      new.account_id, v_account_context, new.context;
  end if;

  if new.category_id is not null then
    select context into v_category_context
      from public.finance_categories
      where id = new.category_id and user_id = new.user_id;

    if v_category_context is null then
      raise exception 'Categoria inválida para este usuário.';
    end if;

    if v_category_context <> new.context then
      raise exception 'A categoria % é do contexto %, mas a recorrência é %.',
        new.category_id, v_category_context, new.context;
    end if;
  end if;

  return new;
end;
$$;

create trigger finance_recurrences_validate_ownership
before insert or update on public.finance_recurrences
for each row
execute function public.finance_recurrences_validate_ownership();

-- finance_budgets: mesma defesa (ownership + contexto) para category_id.
create function public.finance_budgets_validate_ownership()
returns trigger
language plpgsql
as $$
declare
  v_category_context text;
begin
  select context into v_category_context
    from public.finance_categories
    where id = new.category_id and user_id = new.user_id;

  if v_category_context is null then
    raise exception 'Categoria inválida para este usuário.';
  end if;

  if v_category_context <> new.context then
    raise exception 'A categoria % é do contexto %, mas o orçamento é %.',
      new.category_id, v_category_context, new.context;
  end if;

  return new;
end;
$$;

create trigger finance_budgets_validate_ownership
before insert or update on public.finance_budgets
for each row
execute function public.finance_budgets_validate_ownership();
