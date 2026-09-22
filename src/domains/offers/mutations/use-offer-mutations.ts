"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateOfferInput } from "../schemas/offer-schema";
import { createOffer } from "../services/offer-service";

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOfferInput) => createOffer(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.offers });
    },
  });
}
