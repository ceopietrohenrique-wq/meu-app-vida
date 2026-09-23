import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/shared/components/providers/app-providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sistema Operacional da Minha Vida",
    template: "%s · Sistema Operacional da Minha Vida",
  },
  description:
    "App pessoal para rotina, hábitos, metas, saúde, finanças e negócios.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Minha Vida",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Fase 8 > Splash/Apple: sem isso o conteúdo nunca alcança a área atrás
  // do notch/Dynamic Island/home indicator em iPhones — os componentes que
  // precisam respeitar essa área usam `env(safe-area-inset-*)` (já em uso
  // em bottom-nav.tsx desde a Fase 6/7; ver docs/business-rules.md > Fase 8).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
