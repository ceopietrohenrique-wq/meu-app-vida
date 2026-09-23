"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  deactivatePushSubscriptionByEndpoint,
  savePushSubscription,
} from "../services/push-subscription-service";
import { urlBase64ToUint8Array } from "../utils/web-push";

function requireVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error("Notificações push não estão configuradas neste ambiente.");
  }
  return key;
}

/**
 * Só é chamado quando o usuário ativa push explicitamente (nunca
 * automaticamente ao carregar o app — CLAUDE.md > Fase 7 > 3). Pede
 * permissão do browser primeiro; se negada/indisponível, não tenta
 * inscrever.
 */
export function useSubscribeToPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { permission };
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(requireVapidPublicKey()),
        }));

      await savePushSubscription(createClient(), subscription.toJSON());
      return { permission };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.pushSubscriptionStatus,
      });
    },
  });
}

export function useUnsubscribeFromPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await deactivatePushSubscriptionByEndpoint(createClient(), endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.pushSubscriptionStatus,
      });
    },
  });
}
