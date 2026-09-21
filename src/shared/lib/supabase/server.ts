import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Continua usando a chave anon (respeita RLS) — a diferença para
 * o client de browser é a propagação de cookies de sessão via Next.js.
 *
 * `setAll` pode falhar quando chamado a partir de um Server Component
 * (cookies só podem ser escritos em Server Actions/Route Handlers); o catch
 * vazio aqui é o padrão documentado do @supabase/ssr e é seguro porque a
 * sessão já foi/será atualizada pelo middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component sem permissão de escrita.
          // Seguro ignorar: o middleware é responsável por refrescar a sessão.
        }
      },
    },
  });
}
