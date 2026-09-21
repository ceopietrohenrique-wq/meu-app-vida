import type { ReactNode } from "react";

import { SignOutButton } from "@/domains/auth/components/sign-out-button";

import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <span className="text-sm font-semibold tracking-tight md:hidden">
            Minha Vida
          </span>
          <div className="hidden md:block" />
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20 md:px-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
