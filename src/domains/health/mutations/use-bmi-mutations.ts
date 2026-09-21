"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CalculateBmiInput } from "../schemas/bmi-schema";
import { saveBmiCalculation } from "../services/bmi-service";

export function useSaveBmiCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalculateBmiInput) =>
      saveBmiCalculation(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bmiRecords });
    },
  });
}
