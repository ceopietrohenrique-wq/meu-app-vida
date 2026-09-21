import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapNotificationRow,
  type AppNotification,
  type NotificationRow,
} from "../types/notification";

export async function listRecentNotifications(
  supabase: SupabaseClient,
  limit = 20,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) throw new Error("Não foi possível carregar as notificações.");
  return (data ?? []).map(mapNotificationRow);
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error)
    throw new Error("Não foi possível marcar a notificação como lida.");
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error)
    throw new Error("Não foi possível marcar as notificações como lidas.");
}
