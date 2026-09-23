-- Fase 7 — Notificações Push > fila/estado de envio PUSH. Ver
-- docs/business-rules.md > Fase 7.
--
-- IN_APP continua sendo a tabela `notifications` da Fase 1 (nunca um
-- sistema paralelo) — esta tabela nova é exclusiva do ciclo de vida do
-- PUSH, que a Fase 1 nunca teve: geração/seleção, quiet hours, retry,
-- cancelamento lógico e registro de resultado são conceitos que só existem
-- quando o envio não é instantâneo/síncrono como o insert direto em
-- `notifications`.
--
-- entity_id opcional identifica a linha de origem (task_id/session_id) para
-- a revalidação de estado no momento do envio (cancelamento lógico) sem
-- precisar fazer parsing de notification_key.

create table public.scheduled_notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in (
      'tasks', 'water', 'diet', 'workout', 'weight', 'spiritual',
      'finance', 'business', 'daily_summary', 'weekly_summary'
    )
  ),
  entity_id uuid,
  notification_key text not null,
  title text not null,
  body text,
  url text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled', 'failed')),
  scheduled_for timestamptz not null default now(),
  attempt_count integer not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, notification_key)
);

comment on table public.scheduled_notifications is
  'Fila de envio PUSH. status nunca regressa (pending -> sent|cancelled|failed é terminal) — histórico nunca é apagado.';
comment on column public.scheduled_notifications.attempt_count is
  'Incrementado a cada tentativa de envio falha. Job para de tentar após o limite (ver select_due_push_notifications) — nunca loop infinito.';

create index scheduled_notifications_due_idx
  on public.scheduled_notifications (scheduled_for)
  where status = 'pending';
create index scheduled_notifications_user_id_idx
  on public.scheduled_notifications (user_id, created_at desc);

alter table public.scheduled_notifications enable row level security;

-- Só leitura para o próprio usuário (ex.: uma futura tela "notificações
-- agendadas"). Toda escrita passa pelas funções SECURITY DEFINER abaixo,
-- restritas a service_role — nunca o client insere/atualiza esta tabela
-- diretamente (regra de negócio de dedup/estado é sempre no banco, não no
-- client).
create policy scheduled_notifications_select_own
  on public.scheduled_notifications for select using (auth.uid () = user_id);
