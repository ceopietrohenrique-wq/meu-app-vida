"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/shared/components/ui/sonner";
import { ServiceWorkerRegister } from "@/shared/components/pwa/service-worker-register";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </QueryProvider>
    </ThemeProvider>
  );
}
