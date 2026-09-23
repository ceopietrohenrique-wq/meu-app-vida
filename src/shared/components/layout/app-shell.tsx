import type { ReactNode } from "react";

import { SignOutButton } from "@/domains/auth/components/sign-out-button";
import { NotificationBell } from "@/domains/notifications/components/notification-bell";
import { GlobalSearchTrigger } from "@/domains/search/components/global-search-trigger";

import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b px-4 py-3 md:px-6"
          // Fase 8: viewport-fit=cover deixa conteúdo renderizar embaixo do
          // notch/Dynamic Island em iPhone (PWA standalone) — sem isso o
          // header ficaria parcialmente escondido. Mesmo padrão de
          // safe-area já usado em bottom-nav.tsx.
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <span className="text-sm font-semibold tracking-tight md:hidden">
            Minha Vida
          </span>
          <GlobalSearchTrigger />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20 md:px-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
