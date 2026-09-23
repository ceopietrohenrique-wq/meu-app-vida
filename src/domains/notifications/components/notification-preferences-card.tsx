"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

import { useNotificationPreferences } from "../queries/use-notification-preferences";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export function NotificationPreferencesCard() {
  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useNotificationPreferences();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (isError || !preferences) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar as preferências de notificação.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="self-start text-sm font-medium underline-offset-4 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <NotificationPreferencesForm preferences={preferences} />;
}
