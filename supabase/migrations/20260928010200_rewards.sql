-- Progresso > Recompensas. Ver docs/business-rules.md > Fase 6.
--
-- "Disponível" nunca é uma coluna mutável — é sempre XP total (soma de
-- xp_events) >= xp_cost, calculado na hora (mesma filosofia de saldo/
-- estoque calculados das fases anteriores). Resgatar NUNCA subtrai XP
-- retroativamente (CLAUDE.md: XP nunca é negativo/punitivo) — é só um
-- registro histórico de que o usuário escolheu usar a recompensa.

create table public.rewards (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  name text not null,
  description text,
  xp_cost integer not null check (xp_cost > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rewards_user_id_idx on public.rewards (user_id);

create trigger rewards_set_updated_at
before update on public.rewards
for each row
execute function public.set_updated_at();

alter table public.rewards enable row level security;

create policy rewards_select_own
  on public.rewards for select using (auth.uid () = user_id);

create policy rewards_insert_own
  on public.rewards for insert with check (auth.uid () = user_id);

create policy rewards_update_own
  on public.rewards for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy rewards_delete_own
  on public.rewards for delete using (auth.uid () = user_id);

-- Histórico imutável — sem policy de UPDATE/DELETE, mesma filosofia de
-- customer_interactions/inventory_movements.
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  reward_id uuid not null references public.rewards (id) on delete cascade,
  xp_total_at_redemption bigint not null,
  notes text,
  redeemed_at timestamptz not null default now()
);

create index reward_redemptions_user_id_idx on public.reward_redemptions (user_id, redeemed_at desc);

create function public.reward_redemptions_validate_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.rewards where id = new.reward_id and user_id = new.user_id
  ) then
    raise exception 'Recompensa inválida para este usuário.';
  end if;

  return new;
end;
$$;

create trigger reward_redemptions_validate_ownership
before insert on public.reward_redemptions
for each row
execute function public.reward_redemptions_validate_ownership();

alter table public.reward_redemptions enable row level security;

create policy reward_redemptions_select_own
  on public.reward_redemptions for select using (auth.uid () = user_id);

create policy reward_redemptions_insert_own
  on public.reward_redemptions for insert with check (auth.uid () = user_id);

-- Registra o resgate com o XP total NO MOMENTO (snapshot, nunca recalculado
-- depois) — não deduz XP, não cria xp_event. Atômico: uma única RPC, nunca
-- duas chamadas soltas (SELECT do total + INSERT do resgate).
create function public.redeem_reward(p_reward_id uuid, p_notes text default null)
returns public.reward_redemptions
language plpgsql
as $$
declare
  v_total_xp bigint;
  v_redemption public.reward_redemptions;
begin
  select coalesce(sum(xp_amount), 0) into v_total_xp
    from public.xp_events where user_id = auth.uid ();

  insert into public.reward_redemptions (user_id, reward_id, xp_total_at_redemption, notes)
  values (auth.uid (), p_reward_id, v_total_xp, p_notes)
  returning * into v_redemption;

  return v_redemption;
end;
$$;

revoke all on function public.redeem_reward (uuid, text) from public;
grant execute on function public.redeem_reward (uuid, text) to authenticated;
