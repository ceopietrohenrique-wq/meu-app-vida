-- Fase 7 — Notificações Push > Preferências. Ver docs/business-rules.md >
-- Fase 7 e SPEC-ORIGINAL.md > SISTEMA DE PREFERÊNCIAS.
--
-- Uma linha por usuário (não uma linha por categoria — "não precisa criar
-- uma configuração exageradamente granular", CLAUDE.md > Fase 7 > 4):
-- toggles de canal (in_app/push) + toggle por categoria + quiet hours +
-- horário do resumo diário. Presets ESSENCIAL/EQUILIBRADO/INTENSO são só
-- um atalho de UI que ajusta várias colunas de uma vez — não um valor
-- armazenado à parte (evita uma segunda fonte de verdade que pode
-- dessincronizar dos toggles reais).

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid (),
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  tasks_enabled boolean not null default true,
  water_enabled boolean not null default true,
  diet_enabled boolean not null default true,
  workout_enabled boolean not null default true,
  weight_enabled boolean not null default true,
  spiritual_enabled boolean not null default true,
  finance_enabled boolean not null default true,
  business_enabled boolean not null default true,
  daily_summary_enabled boolean not null default true,
  weekly_summary_enabled boolean not null default true,
  daily_summary_time time not null default '20:00',
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.notification_preferences.push_enabled is
  'Nunca true por padrão — só vira true quando o usuário ativa push explicitamente (CLAUDE.md > Fase 7 > 3: nunca pedir permissão automaticamente).';
comment on column public.notification_preferences.quiet_hours_start is
  'Início do horário silencioso. Pode ser maior que quiet_hours_end (ex.: 22:00 -> 07:00), indicando que o intervalo cruza a meia-noite.';

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy notification_preferences_select_own
  on public.notification_preferences for select using (auth.uid () = user_id);

create policy notification_preferences_insert_own
  on public.notification_preferences for insert with check (auth.uid () = user_id);

create policy notification_preferences_update_own
  on public.notification_preferences for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

-- Sem policy de delete: preferências acompanham o usuário enquanto a conta
-- existir (cascade via auth.users on delete cascade cobre a exclusão real
-- de conta).

-- Cria a linha de preferências automaticamente junto com o profile, mesmo
-- padrão de handle_new_user (profiles). security definer necessário pelo
-- mesmo motivo: o trigger roda a partir de auth.users, fora do contexto de
-- RLS do usuário recém-criado.
create or replace function public.handle_new_user_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_notification_preferences
after insert on auth.users
for each row
execute function public.handle_new_user_notification_preferences ();

-- Backfill para usuários já existentes (Fases 0-6) que nunca passaram pelo
-- trigger de criação.
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
