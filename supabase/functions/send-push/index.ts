// Fase 7 — Notificações Push > Edge Function de envio.
//
// Roda fora do browser (Deno, Supabase Edge Functions) porque:
//   1. precisa da service_role key para chamar as RPCs restritas a
//      service_role (select_due_push_notifications/mark_push_notification_*)
//      — uma service_role key NUNCA pode existir no client (CLAUDE.md >
//      Fase 7 > 12);
//   2. precisa da chave PRIVADA VAPID para assinar o Web Push — também nunca
//      pode existir no client.
//
// Separação geração/envio/registro (CLAUDE.md > Fase 7 > 9): esta função só
// SELECIONA (via select_due_push_notifications, que já revalida estado e
// filtra quiet hours) e ENVIA — a geração roda numa função separada
// (generate-notifications). O registro do resultado é a última etapa desta
// mesma função (mark_push_notification_sent/failed), separada por ser
// outra fase do fluxo, não porque está noutro processo.
//
// Passo externo pendente (não pode ser feito localmente, ver relatório da
// Fase 7): configurar VAPID_PRIVATE_KEY/VAPID_PUBLIC_KEY/VAPID_SUBJECT como
// secrets do projeto Supabase (`supabase secrets set ...`) e agendar a
// chamada desta função (pg_cron + pg_net, ou Supabase Scheduled Functions,
// ou um cron externo autenticado) — sem isso a função existe mas nunca é
// disparada automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@example.com";
// Só esta função pode chamar a si mesma via cron — protege contra qualquer
// pessoa disparar envio de push fazendo um POST direto no endpoint público.
const CRON_SECRET = Deno.env.get("CRON_SECRET");

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type ScheduledNotification = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  url: string | null;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: due, error: selectError } = await supabase.rpc(
    "select_due_push_notifications",
    { p_limit: 100 },
  );

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notifications = (due ?? []) as ScheduledNotification[];
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notification.user_id)
      .eq("is_active", true)
      .returns<PushSubscriptionRow[]>();

    if (!subscriptions || subscriptions.length === 0) {
      // Sem dispositivo ativo para enviar — não é uma falha de envio, é
      // ausência de destino. Marca sent para não ficar reprocessando para
      // sempre (o usuário desativou push em todos os dispositivos).
      await supabase.rpc("mark_push_notification_sent", {
        p_id: notification.id,
      });
      continue;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body ?? "",
      url: notification.url ?? "/",
      tag: notification.category,
    });

    let anySucceeded = false;
    let lastError = "";

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        anySucceeded = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        lastError = error instanceof Error ? error.message : String(error);
        // 404/410: o push service confirmou que o endpoint não existe mais
        // (app desinstalado, permissão revogada no OS, etc.) — só nesse
        // caso desativamos a subscription. Erros transitórios (rede, 5xx)
        // nunca desativam (CLAUDE.md > Fase 7 > 13).
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("deactivate_push_subscription", {
            p_subscription_id: subscription.id,
          });
        }
      }
    }

    if (anySucceeded) {
      await supabase.rpc("mark_push_notification_sent", {
        p_id: notification.id,
      });
      sent++;
    } else {
      await supabase.rpc("mark_push_notification_failed", {
        p_id: notification.id,
        p_error: lastError || "Nenhuma subscription ativa aceitou o envio.",
      });
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ selected: notifications.length, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
