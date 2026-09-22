-- Progresso > Metas trimestrais. Ver docs/database.md > Fase 6.
--
-- Reaproveita a tabela `goals` já criada na Fase 1 (já tem `type` incluindo
-- 'trimestral') em vez de criar `quarterly_goals` nova — evita duplicar
-- conceito. Só adiciona o que faltava: uma forma de marcar a meta como
-- concluída (`is_completed`, já que "resultado atingido" nem sempre é
-- numérico) e o vínculo opcional "meta semanal ligada à trimestral"
-- (CLAUDE.md > Fase 6: "as metas semanais poderão estar ligadas às metas
-- trimestrais").

alter table public.goals
  add column is_completed boolean not null default false,
  add column parent_goal_id uuid references public.goals (id) on delete set null;

create index goals_user_id_type_idx on public.goals (user_id, type);

-- Defesa em profundidade: parent_goal_id não pode apontar para uma meta de
-- outro usuário (a FK sozinha só garante que a linha existe).
create function public.goals_validate_parent_ownership()
returns trigger
language plpgsql
as $$
begin
  if new.parent_goal_id is not null then
    if new.parent_goal_id = new.id then
      raise exception 'Uma meta não pode ser pai dela mesma.';
    end if;

    if not exists (
      select 1 from public.goals
      where id = new.parent_goal_id and user_id = new.user_id
    ) then
      raise exception 'Meta pai inválida para este usuário.';
    end if;
  end if;

  return new;
end;
$$;

create trigger goals_validate_parent_ownership
before insert or update on public.goals
for each row
execute function public.goals_validate_parent_ownership();

-- "Metas semanais podem estar ligadas às metas trimestrais": vínculo
-- opcional no planejamento semanal (Fase 1), aditivo — não altera nenhum
-- comportamento existente de weekly_plans.
alter table public.weekly_plans
  add column quarterly_goal_id uuid references public.goals (id) on delete set null;

create function public.weekly_plans_validate_quarterly_goal()
returns trigger
language plpgsql
as $$
begin
  if new.quarterly_goal_id is not null and not exists (
    select 1 from public.goals
    where id = new.quarterly_goal_id and user_id = new.user_id and type = 'trimestral'
  ) then
    raise exception 'Meta trimestral inválida para este usuário.';
  end if;

  return new;
end;
$$;

create trigger weekly_plans_validate_quarterly_goal
before insert or update on public.weekly_plans
for each row
execute function public.weekly_plans_validate_quarterly_goal();
