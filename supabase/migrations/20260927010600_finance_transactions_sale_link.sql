-- Negócios > integração com Financeiro. Ver docs/business-rules.md > Fase 5.
--
-- A Fase 4 reservou finance_transactions.sale_id como uuid solto (mesma
-- lógica de business_id). Agora que `sales` existe, a FK entra de verdade,
-- e a validação de ownership de finance_transactions (Fase 4) é estendida
-- para cobrir business_id/sale_id também — nunca deixar uma transação
-- financeira apontar para negócio/venda de outro usuário.

alter table public.finance_transactions
  add constraint finance_transactions_sale_id_fkey
  foreign key (sale_id) references public.sales (id) on delete set null;

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

  if new.business_id is not null and not exists (
    select 1 from public.businesses where id = new.business_id and user_id = new.user_id
  ) then
    raise exception 'Negócio inválido para este usuário.';
  end if;

  if new.sale_id is not null and not exists (
    select 1 from public.sales where id = new.sale_id and user_id = new.user_id
  ) then
    raise exception 'Venda inválida para este usuário.';
  end if;

  return new;
end;
$$;
