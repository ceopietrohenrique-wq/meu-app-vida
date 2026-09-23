-- Fase 7 — Notificações Push > Push subscriptions. Ver docs/business-rules.md
-- > Fase 7 e docs/architecture.md > 10. Notificações.
--
-- Uma linha por (usuário, dispositivo/navegador) — o mesmo usuário pode ter
-- várias subscriptions ativas (celular + desktop). endpoint/p256dh/auth vêm
-- do PushSubscription do browser (chaves PÚBLICAS do dispositivo, nunca um
-- secret do servidor — a chave privada VAPID nunca entra nesta tabela nem
-- em nenhuma tabela client-acessível).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

comment on table public.push_subscriptions is
  'Subscriptions de Web Push por usuário/dispositivo. Nunca deletada automaticamente em erro transitório — is_active=false quando o endpoint é confirmado inválido/expirado (404/410 do push service).';

create index push_subscriptions_user_id_active_idx
  on public.push_subscriptions (user_id)
  where is_active;

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select using (auth.uid () = user_id);

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert with check (auth.uid () = user_id);

create policy push_subscriptions_update_own
  on public.push_subscriptions for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete using (auth.uid () = user_id);
