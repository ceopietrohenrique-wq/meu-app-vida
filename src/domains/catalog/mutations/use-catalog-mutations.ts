"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateCatalogItemInput } from "../schemas/catalog-item-schema";
import {
  createCatalogItem,
  setCatalogItemActive,
} from "../services/catalog-service";

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.catalogItems });
}

export function useCreateCatalogItem() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: CreateCatalogItemInput) =>
      createCatalogItem(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useSetCatalogItemActive() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({
      catalogItemId,
      isActive,
    }: {
      catalogItemId: string;
      isActive: boolean;
    }) => setCatalogItemActive(createClient(), catalogItemId, isActive),
    onSuccess: invalidate,
  });
}
