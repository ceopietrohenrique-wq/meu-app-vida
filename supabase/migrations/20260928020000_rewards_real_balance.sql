-- Auditoria final Fase 6 > item 3 (recompensas/XP disponível).
--
-- O que existia antes: "disponível" era só XP total >= custo, sem nunca
-- registrar o custo gasto — ou seja, o mesmo XP podia ser usado para
-- resgatar a mesma recompensa infinitas vezes, o que não é um sistema de
-- recompensas de verdade (SPEC-ORIGINAL.md > RECOMPENSAS: "uma recompensa
-- pode ficar disponível, ser resgatada, guardar histórico" pressupõe que o
-- XP usado é consumido).
--
-- Correção: XP disponível = XP acumulado (soma de xp_events, nunca alterada)
-- MENOS XP já gasto (soma de reward_redemptions.xp_cost_at_redemption, nunca
-- xp_events negativo — XP em si continua imutável e nunca punitivo,
-- CLAUDE.md > XP). O saldo é sempre CALCULADO, nunca uma coluna mutável —
-- mesma filosofia de saldo de conta (Fase 4) e estoque (Fase 5).
--
-- xp_cost_at_redemption é um snapshot do custo da recompensa NO MOMENTO do
-- resgate (a recompensa pode mudar de preço depois) — sem isso o "já gasto"
-- calculado depois divergiria do que realmente foi debitado na hora.

alter table public.reward_redemptions
  add column xp_cost_at_redemption integer,
  add column client_request_id uuid;

update public.reward_redemptions rr
  set xp_cost_at_redemption = r.xp_cost
  from public.rewards r
  where rr.reward_id = r.id and rr.xp_cost_at_redemption is null;

-- Nenhuma linha deveria sobrar sem custo (reward_id é NOT NULL FK), mas se
-- a recompensa original já tiver sido apagada por algum motivo, 0 é o
-- valor seguro (nunca aumenta artificialmente o "já gasto").
update public.reward_redemptions
  set xp_cost_at_redemption = 0
  where xp_cost_at_redemption is null;

alter table public.reward_redemptions
  alter column xp_cost_at_redemption set not null;

create unique index reward_redemptions_client_request_id_unique
  on public.reward_redemptions (user_id, client_request_id)
  where client_request_id is not null;

drop function public.redeem_reward (uuid, text);

-- Resgate agora é: (1) idempotente a reenvio (client_request_id, mesmo
-- padrão de create_finance_transaction/create_sale), (2) protegido contra
-- concorrência real (pg_advisory_xact_lock por usuário — não existe uma
-- linha de "carteira" para travar com SELECT ... FOR UPDATE como a venda
-- trava a própria linha de sales, então o lock é por auth.uid()), e (3)
-- valida saldo (acumulado - já gasto) >= custo NO SERVIDOR, nunca só na UI.
create function public.redeem_reward(
  p_reward_id uuid,
  p_notes text default null,
  p_client_request_id uuid default null
)
returns public.reward_redemptions
language plpgsql
as $$
declare
  v_reward public.rewards;
  v_total_earned bigint;
  v_total_spent bigint;
  v_redemption public.reward_redemptions;
begin
  if p_client_request_id is not null then
    select * into v_redemption
      from public.reward_redemptions
      where user_id = auth.uid () and client_request_id = p_client_request_id;
    if found then
      return v_redemption;
    end if;
  end if;

  perform pg_advisory_xact_lock (hashtextextended (auth.uid ()::text, 0));

  select * into v_reward
    from public.rewards
    where id = p_reward_id and user_id = auth.uid ();

  if not found then
    raise exception 'Recompensa inválida para este usuário.';
  end if;

  if not v_reward.is_active then
    raise exception 'Recompensa não está mais ativa.';
  end if;

  select coalesce(sum(xp_amount), 0) into v_total_earned
    from public.xp_events where user_id = auth.uid ();

  select coalesce(sum(xp_cost_at_redemption), 0) into v_total_spent
    from public.reward_redemptions where user_id = auth.uid ();

  if (v_total_earned - v_total_spent) < v_reward.xp_cost then
    raise exception 'XP insuficiente para resgatar esta recompensa.';
  end if;

  insert into public.reward_redemptions (
    user_id, reward_id, xp_total_at_redemption, xp_cost_at_redemption, notes, client_request_id
  )
  values (
    auth.uid (), p_reward_id, v_total_earned, v_reward.xp_cost, p_notes, p_client_request_id
  )
  returning * into v_redemption;

  return v_redemption;
end;
$$;

revoke all on function public.redeem_reward (uuid, text, uuid) from public;
grant execute on function public.redeem_reward (uuid, text, uuid) to authenticated;
