"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../mutations/use-notification-mutations";
import { useNotifications } from "../queries/use-notifications";

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificações"
            className="relative"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Notificações</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        {notifications.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-center text-sm">
            Nenhuma notificação ainda.
          </p>
        )}
        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex flex-col items-start gap-0.5 whitespace-normal"
            onClick={() =>
              !notification.readAt && markRead.mutate(notification.id)
            }
          >
            <span
              className={notification.readAt ? "font-normal" : "font-semibold"}
            >
              {notification.title}
            </span>
            {notification.body && (
              <span className="text-muted-foreground text-xs">
                {notification.body}
              </span>
            )}
            <span className="text-muted-foreground text-[11px]">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
