"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { getNotificationPreferences } from "../services/notification-preferences-service";

export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.notificationPreferences,
    queryFn: () => getNotificationPreferences(createClient()),
  });
}
