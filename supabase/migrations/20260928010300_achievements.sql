-- Progresso > Conquistas. Ver docs/business-rules.md > Fase 6.
--
-- Conquistas são definições FIXAS (chave + condição), não uma tabela
-- configurável pelo usuário — mesmo espírito de simplicidade de
-- `SPEC-ORIGINAL.md` > Recompensas ("não criar punições agressivas"),
-- adaptado: nenhuma conquista é removida/perdida depois de desbloqueada
-- (histórico imutável, sem policy de UPDATE/DELETE).
--
-- Condições usam contagens/somas simples (nunca recomputam o algoritmo de
-- streak de `shared/lib/streak.ts` em SQL) — proporcional ao escopo desta
-- fase.

create table public.user_achievements (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  achievement_key text not null check (
    achievement_key in (
      'primeira_tarefa', 'dez_tarefas', 'primeiro_habito', 'sete_devocionais',
      'primeiro_treino', 'primeira_venda', 'meta_trimestral_concluida', 'mil_xp'
    )
  ),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index user_achievements_user_id_idx on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

create policy user_achievements_select_own
  on public.user_achievements for select using (auth.uid () = user_id);

create policy user_achievements_insert_own
  on public.user_achievements for insert with check (auth.uid () = user_id);

-- Sem policy de UPDATE/DELETE: uma conquista desbloqueada nunca é perdida.

-- Avalia todas as condições e desbloqueia as que ainda não foram
-- desbloqueadas (idempotente via UNIQUE + ON CONFLICT DO NOTHING). Retorna
-- só as conquistas desbloqueadas NESTA chamada, para a UI poder notificar
-- só as novas.
create function public.check_and_unlock_achievements()
returns setof public.user_achievements
language plpgsql
as $$
declare
  v_row public.user_achievements;
  v_revenue_statuses constant text[] := array['confirmed', 'paid', 'delivered'];
begin
  if (select count(*) from public.tasks where user_id = auth.uid () and status = 'concluida') >= 1 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'primeira_tarefa')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (select count(*) from public.tasks where user_id = auth.uid () and status = 'concluida') >= 10 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'dez_tarefas')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (select count(*) from public.habit_logs where user_id = auth.uid ()) >= 1 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'primeiro_habito')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (
    select count(*) from public.devotionals
    where user_id = auth.uid () and read_done and reflection_done and prayer_done
  ) >= 7 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'sete_devocionais')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (
    select count(*) from public.workout_sessions
    where user_id = auth.uid () and completed_at is not null
  ) >= 1 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'primeiro_treino')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (
    select count(*) from public.sales
    where user_id = auth.uid () and status = any (v_revenue_statuses)
  ) >= 1 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'primeira_venda')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if (
    select count(*) from public.goals
    where user_id = auth.uid () and type = 'trimestral' and is_completed
  ) >= 1 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'meta_trimestral_concluida')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  if coalesce((select sum(xp_amount) from public.xp_events where user_id = auth.uid ()), 0) >= 1000 then
    v_row := null;
    insert into public.user_achievements (user_id, achievement_key)
      values (auth.uid (), 'mil_xp')
      on conflict (user_id, achievement_key) do nothing
      returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
  end if;

  return;
end;
$$;

revoke all on function public.check_and_unlock_achievements () from public;
grant execute on function public.check_and_unlock_achievements () to authenticated;
