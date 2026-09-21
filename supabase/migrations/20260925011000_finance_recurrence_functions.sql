-- Financeiro > geração idempotente de ocorrências de recorrência. Ver
-- docs/business-rules.md > Fase 4 > Recorrências.
--
-- Nunca gera a mesma ocorrência duas vezes: a UNIQUE(recurrence_id,
-- transaction_date) parcial (ver 20260925010300) é a garantia real, esta
-- função só evita trabalho redundante calculando a partir do que já existe.

create function public.generate_finance_recurrence_occurrences(p_recurrence_id uuid, p_until date)
returns setof public.finance_transactions
language plpgsql
as $$
declare
  v_rec public.finance_recurrences;
  v_generated_count integer;
  v_month_start date;
  v_last_day_of_month integer;
  v_day integer;
  v_next_date date;
  v_row public.finance_transactions;
begin
  select * into v_rec
    from public.finance_recurrences
    where id = p_recurrence_id and user_id = auth.uid ();

  if not found then
    raise exception 'Recorrência não encontrada.';
  end if;

  select count(*) into v_generated_count
    from public.finance_transactions
    where recurrence_id = p_recurrence_id;

  v_month_start := date_trunc('month', v_rec.starts_on)::date;

  while v_month_start <= p_until loop
    exit when v_rec.total_installments is not null and v_generated_count >= v_rec.total_installments;
    exit when v_rec.ends_on is not null and v_month_start > v_rec.ends_on;

    v_last_day_of_month := extract(day from ((v_month_start + interval '1 month') - interval '1 day'))::integer;
    v_day := least(v_rec.day_of_month, v_last_day_of_month);
    v_next_date := (v_month_start + ((v_day - 1) * interval '1 day'))::date;

    if v_next_date >= v_rec.starts_on
       and v_next_date <= p_until
       and (v_rec.ends_on is null or v_next_date <= v_rec.ends_on) then

      v_row := null;

      insert into public.finance_transactions (
        user_id, account_id, type, context, amount, description,
        category_id, transaction_date, payment_method, recurrence_id
      )
      values (
        v_rec.user_id, v_rec.account_id, v_rec.type, v_rec.context, v_rec.amount, v_rec.name,
        v_rec.category_id, v_next_date, v_rec.payment_method, v_rec.id
      )
      on conflict (recurrence_id, transaction_date) where (recurrence_id is not null) do nothing
      returning * into v_row;

      if v_row.id is not null then
        v_generated_count := v_generated_count + 1;
        return next v_row;
      end if;
    end if;

    v_month_start := (v_month_start + interval '1 month')::date;
  end loop;

  return;
end;
$$;

revoke all on function public.generate_finance_recurrence_occurrences (uuid, date) from public;
grant execute on function public.generate_finance_recurrence_occurrences (uuid, date) to authenticated;
