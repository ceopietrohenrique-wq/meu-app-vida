import { NextResponse } from "next/server";

import { createClient } from "@/shared/lib/supabase/server";

/**
 * Troca o `code` (PKCE) enviado por e-mail — confirmação de cadastro ou
 * recuperação de senha — por uma sessão real, e redireciona para `next`
 * (padrão: home) ou para /atualizar-senha no fluxo de recuperação.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
