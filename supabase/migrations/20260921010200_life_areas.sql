-- Áreas da vida, usadas para classificar tarefas/hábitos/metas (Fase 1+).
-- Ver docs/database.md. Inserção das áreas sugeridas fica para o fluxo de
-- onboarding/seed (Fase 1) — esta migration só cria a estrutura.

create table public.life_areas (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'primary'
    check (color in ('primary', 'success', 'warning', 'danger', 'muted')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.life_areas.color is
  'Token semântico do design system (primary/success/warning/danger/muted) — nunca hex livre.';

create index life_areas_user_id_idx on public.life_areas (user_id);

alter table public.life_areas enable row level security;

create policy life_areas_select_own
  on public.life_areas
  for select
  using (auth.uid () = user_id);

create policy life_areas_insert_own
  on public.life_areas
  for insert
  with check (auth.uid () = user_id);

create policy life_areas_update_own
  on public.life_areas
  for update
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy life_areas_delete_own
  on public.life_areas
  for delete
  using (auth.uid () = user_id);
