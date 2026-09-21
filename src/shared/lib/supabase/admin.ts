import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase com a service role key: ignora RLS por completo.
 *
 * Uso restrito a operações administrativas/server-only que precisam
 * explicitamente contornar RLS (ex.: jobs de sistema, webhooks assinados).
 * O import de "server-only" faz o build falhar caso este módulo seja
 * importado, direta ou indiretamente, por um Client Component.
 *
 * Nunca usar este client para servir uma requisição de usuário comum —
 * para isso, use `shared/lib/supabase/server.ts`, que respeita RLS.
 */
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
