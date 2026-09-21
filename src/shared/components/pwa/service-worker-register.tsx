"use client";

import { useEffect } from "react";

/**
 * Registra o service worker quando o navegador suporta a API — nunca
 * quebra o app quando não suporta (ex.: alguns navegadores in-app, modo
 * privado restrito). Ver CLAUDE.md > iOS/iPhone e > Web Push/PWA.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro de SW é um enhancement progressivo — falhar aqui não pode
      // impedir o app de funcionar normalmente.
    });
  }, []);

  return null;
}
