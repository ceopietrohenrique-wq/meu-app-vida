"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateMeasurementInput } from "../schemas/measurement-schema";
import { createMeasurement } from "../services/measurement-service";

export function useCreateMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeasurementInput) =>
      createMeasurement(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.measurements });
    },
  });
}
