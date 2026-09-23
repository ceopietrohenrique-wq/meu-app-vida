"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { UpdateNotificationPreferencesInput } from "../schemas/notification-preferences-schema";
import { updateNotificationPreferences } from "../services/notification-preferences-service";

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      updateNotificationPreferences(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notificationPreferences,
      });
    },
  });
}
