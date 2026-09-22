"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateBusinessInput } from "../schemas/business-schema";
import { createBusiness } from "../services/business-service";

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessInput) =>
      createBusiness(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businesses });
    },
  });
}
