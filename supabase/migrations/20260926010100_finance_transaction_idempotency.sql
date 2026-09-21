-- Auditoria Fase 4 > item 1: transferência (e qualquer transação) não pode
-- ser aplicada duas vezes por double-submit (clique duplo, retry de rede).
-- A proteção de UI (botão desabilitado durante o submit) já existia, mas
-- não é a garantia real — CLAUDE.md exige a garantia no banco.
--
-- client_request_id é gerado UMA VEZ no client quando o formulário é aberto
-- (não a cada clique) e reenviado em toda tentativa daquele mesmo envio.
-- UNIQUE(user_id, client_request_id) é o que torna o INSERT idempotente de
-- verdade: reenviar a mesma chave nunca cria uma segunda linha.

alter table public.finance_transactions add column client_request_id uuid;

create unique index finance_transactions_client_request_id_unique
  on public.finance_transactions (user_id, client_request_id)
  where client_request_id is not null;

-- RPC única e atômica para criar transação: um único INSERT (atomicidade de
-- statement do Postgres é suficiente aqui — não há segunda tabela a
-- coordenar, diferente de venda+estoque+financeiro+XP), com idempotência
-- real via ON CONFLICT DO NOTHING + fallback de leitura da linha já
-- existente. É a mesma transação de banco quer seja a primeira tentativa
-- (INSERT) quer seja um reenvio (SELECT da linha já criada).
create function public.create_finance_transaction(
  p_account_id uuid,
  p_type text,
  p_context text,
  p_amount numeric,
  p_transaction_date date,
  p_description text default null,
  p_category_id uuid default null,
  p_payment_method text default null,
  p_transfer_account_id uuid default null,
  p_notes text default null,
  p_client_request_id uuid default null
)
returns public.finance_transactions
language plpgsql
as $$
declare
  v_tx public.finance_transactions;
begin
  insert into public.finance_transactions (
    user_id, account_id, type, context, amount, description,
    category_id, transaction_date, payment_method, transfer_account_id,
    notes, client_request_id
  )
  values (
    auth.uid (), p_account_id, p_type, p_context, p_amount, p_description,
    p_category_id, p_transaction_date, p_payment_method, p_transfer_account_id,
    p_notes, p_client_request_id
  )
  on conflict (user_id, client_request_id) where (client_request_id is not null) do nothing
  returning * into v_tx;

  if v_tx.id is null and p_client_request_id is not null then
    select * into v_tx
      from public.finance_transactions
      where user_id = auth.uid () and client_request_id = p_client_request_id;
  end if;

  return v_tx;
end;
$$;

revoke all on function public.create_finance_transaction (
  uuid, text, text, numeric, date, text, uuid, text, uuid, text, uuid
) from public;
grant execute on function public.create_finance_transaction (
  uuid, text, text, numeric, date, text, uuid, text, uuid, text, uuid
) to authenticated;
