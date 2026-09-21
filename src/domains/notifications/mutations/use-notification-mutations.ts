"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications-service";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(createClient(), notificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(createClient()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });
}
