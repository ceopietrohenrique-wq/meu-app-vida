"use client";

import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import {
  useSubscribeToPush,
  useUnsubscribeFromPush,
} from "../mutations/use-push-subscription-mutations";
import { useNotificationPermission } from "../queries/use-notification-permission";
import { usePushSubscriptionStatus } from "../queries/use-push-subscription-status";
import { isPushSupported } from "../utils/web-push";

/**
 * Nunca pede permissão automaticamente — só quando o usuário clica em
 * "Ativar notificações push" (CLAUDE.md > Fase 7 > 3). Trata os 3 estados
 * do browser (granted/denied/default) e, se negada, mostra um estado
 * compreensível sem ficar pedindo de novo (o browser nem permite reabrir o
 * prompt nesse caso — só o usuário reautorizando manualmente nas
 * configurações do navegador).
 */
export function PushNotificationsToggle() {
  const { permission, refresh } = useNotificationPermission();
  const { data: isSubscribed, isLoading } = usePushSubscriptionStatus();
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();

  if (typeof window !== "undefined" && !isPushSupported()) {
    return (
      <p className="text-muted-foreground text-sm">
        Notificações push não são suportadas neste navegador.
      </p>
    );
  }

  async function handleEnable() {
    try {
      const result = await subscribe.mutateAsync();
      refresh();
      if (result.permission === "granted") {
        toast.success("Notificações push ativadas.");
      } else if (result.permission === "denied") {
        toast.error("Permissão de notificações negada.");
      }
    } catch {
      toast.error("Não foi possível ativar as notificações push.");
    }
  }

  async function handleDisable() {
    try {
      await unsubscribe.mutateAsync();
      toast.success("Notificações push desativadas.");
    } catch {
      toast.error("Não foi possível desativar as notificações push.");
    }
  }

  if (permission === "denied") {
    return (
      <p className="text-muted-foreground text-sm">
        Você bloqueou as notificações deste app no navegador. Para reativar,
        ajuste a permissão de notificações nas configurações do navegador.
      </p>
    );
  }

  if (isSubscribed && permission === "granted") {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">Notificações push ativadas neste dispositivo.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unsubscribe.isPending}
          onClick={handleDisable}
        >
          {unsubscribe.isPending ? "Desativando…" : "Desativar"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        Receba lembretes e resumos mesmo com o app fechado.
      </p>
      <Button
        type="button"
        size="sm"
        disabled={subscribe.isPending || isLoading}
        onClick={handleEnable}
      >
        {subscribe.isPending ? "Ativando…" : "Ativar notificações push"}
      </Button>
    </div>
  );
}
