"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateInventoryMovementInput } from "../schemas/inventory-movement-schema";
import {
  createInventoryMovement,
  setInventoryMinimumQuantity,
} from "../services/inventory-service";

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryLevels });
}

export function useCreateInventoryMovement() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({
      input,
      clientRequestId,
    }: {
      input: CreateInventoryMovementInput;
      clientRequestId: string;
    }) => createInventoryMovement(createClient(), input, clientRequestId),
    onSuccess: invalidate,
  });
}

export function useSetInventoryMinimumQuantity() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({
      catalogItemId,
      minimumQuantity,
    }: {
      catalogItemId: string;
      minimumQuantity: number | undefined;
    }) =>
      setInventoryMinimumQuantity(
        createClient(),
        catalogItemId,
        minimumQuantity,
      ),
    onSuccess: invalidate,
  });
}
