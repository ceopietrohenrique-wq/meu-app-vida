-- Perfil estendido do usuário (1:1 com auth.users). Ver docs/database.md.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  timezone text not null default 'America/Sao_Paulo',
  week_start smallint not null default 1 check (week_start between 0 and 6),
  currency text not null default 'BRL',
  weekly_xp_goal integer not null default 500 check (weekly_xp_goal >= 0),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil estendido do usuário autenticado. Uma linha por auth.users.';
comment on column public.profiles.week_start is
  '0 = domingo .. 6 = sábado. Nunca hardcodar segunda-feira no app.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Cria automaticamente a linha de profiles quando um usuário se cadastra.
-- security definer é necessário porque a função roda a partir de um trigger
-- em auth.users (fora do contexto de RLS do usuário recém-criado).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid () = id);

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (auth.uid () = id);

create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid () = id)
  with check (auth.uid () = id);

create policy profiles_delete_own
  on public.profiles
  for delete
  using (auth.uid () = id);
