"use client";

import { useSyncExternalStore } from "react";

export type NotificationPermissionState =
  "granted" | "denied" | "default" | "unsupported";

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): NotificationPermissionState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function getServerSnapshot(): NotificationPermissionState {
  return "default";
}

/** Chamado depois de requestPermission() resolver, para que os componentes
 * inscritos releiam Notification.permission. */
export function notifyNotificationPermissionChanged() {
  for (const listener of listeners) listener();
}

/**
 * Só LÊ o estado atual da permissão do browser (Notification.permission) —
 * nunca chama requestPermission aqui. Pedir permissão é sempre uma ação
 * explícita do usuário (ver useSubscribeToPush).
 *
 * useSyncExternalStore em vez de useEffect+setState: é o mecanismo do
 * próprio React para ler estado de uma API externa ao React (aqui, o
 * browser) sem cascata de re-render nem mismatch de hidratação —
 * getServerSnapshot devolve "default" no SSR, e o React já resolve a
 * releitura no client sozinho.
 */
export function useNotificationPermission(): {
  permission: NotificationPermissionState;
  refresh: () => void;
} {
  const permission = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return { permission, refresh: notifyNotificationPermissionChanged };
}
