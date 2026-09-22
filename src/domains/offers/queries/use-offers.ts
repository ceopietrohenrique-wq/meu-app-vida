"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listOffers } from "../services/offer-service";

export function useOffers(businessId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.offers, businessId ?? "all"],
    queryFn: () => listOffers(createClient(), businessId),
  });
}
