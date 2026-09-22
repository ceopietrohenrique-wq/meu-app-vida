"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listBusinesses } from "../services/business-service";

export function useBusinesses() {
  return useQuery({
    queryKey: QUERY_KEYS.businesses,
    queryFn: () => listBusinesses(createClient()),
  });
}
