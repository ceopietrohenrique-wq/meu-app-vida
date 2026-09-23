// Fase 7 — Notificações Push > Edge Function de geração.
//
// Só chama generate_scheduled_notifications() (SECURITY DEFINER,
// service_role) — toda a regra de negócio (estado atual, dedup, preferência
// por categoria) já vive no Postgres (supabase/migrations/20260929010500_*
// e 20260929010600_*). Esta função existe só para dar um endpoint agendável
// separado do endpoint de envio (CLAUDE.md > Fase 7 > 9: separar
// geração/seleção de envio).
//
// Passo externo pendente: agendar a chamada desta função periodicamente
// (ex.: a cada 15-30 min) — ver supabase/functions/send-push/index.ts e o
// relatório da Fase 7 para o mecanismo exato.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc(
    "generate_scheduled_notifications",
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ results: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
