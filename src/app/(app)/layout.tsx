import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/shared/components/layout/app-shell";
import { createClient } from "@/shared/lib/supabase/server";

/**
 * Defesa em profundidade: o `proxy` (middleware) já redireciona usuários
 * sem sessão, mas o layout confere de novo no servidor — nunca confiar
 * apenas em esconder itens de menu no client (CLAUDE.md > SEGURANÇA DE
 * ROUTES).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
