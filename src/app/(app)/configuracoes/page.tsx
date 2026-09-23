import type { Metadata } from "next";

import { NotificationPreferencesCard } from "@/domains/notifications/components/notification-preferences-card";
import { ProfileSettings } from "@/domains/settings/components/profile-settings";
import { InstallAppButton } from "@/shared/components/pwa/install-app-button";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-md flex-col gap-8">
      <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
      <ProfileSettings />
      <div className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Notificações</h2>
        <NotificationPreferencesCard />
      </div>
      <div className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">App</h2>
        {/* Só renderiza algo quando o browser sinaliza instalabilidade de
            verdade (beforeinstallprompt) — nunca aparece no iOS/Safari, que
            não expõe essa API; nesse caso "Adicionar à Tela de Início" pelo
            menu do Safari é o único caminho (ver docs/business-rules.md >
            Fase 8). */}
        <InstallAppButton />
      </div>
    </div>
  );
}
