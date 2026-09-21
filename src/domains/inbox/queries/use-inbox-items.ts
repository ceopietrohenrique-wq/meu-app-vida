"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listInboxItems } from "../services/inbox-service";

export function useInboxItems() {
  return useQuery({
    queryKey: QUERY_KEYS.inbox,
    queryFn: () => listInboxItems(createClient()),
  });
}
