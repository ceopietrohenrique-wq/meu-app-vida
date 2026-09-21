"use client";

import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listMeasurements } from "../services/measurement-service";

export function useMeasurements() {
  return useQuery({
    queryKey: QUERY_KEYS.measurements,
    queryFn: () => listMeasurements(createClient()),
  });
}
