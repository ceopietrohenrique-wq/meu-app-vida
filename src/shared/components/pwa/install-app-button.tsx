"use client";

import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Fase 8 > Instalabilidade: nunca um botão "Instalar" falso — só existe
 * quando o browser realmente dispara `beforeinstallprompt` (sinal real de
 * que a instalação é possível AGORA). iOS/Safari nunca dispara esse
 * evento (Apple não expõe essa API) — nesse caso o componente
 * simplesmente nunca aparece, é o comportamento correto, não um bug (ver
 * docs/business-rules.md > Fase 8 > limitações do iOS).
 */
export function InstallAppButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!installEvent) return null;

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // O evento só pode ser usado uma vez — independentemente do resultado,
    // não há um novo prompt para oferecer até o browser disparar de novo.
    setInstallEvent(null);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleInstall}>
      Instalar app
    </Button>
  );
}
