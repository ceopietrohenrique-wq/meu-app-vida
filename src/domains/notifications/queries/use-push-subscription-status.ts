"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { hasActivePushSubscription } from "../services/push-subscription-service";

export function usePushSubscriptionStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.pushSubscriptionStatus,
    queryFn: () => hasActivePushSubscription(createClient()),
  });
}
