"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateSavedVerseInput } from "../schemas/saved-verse-schema";
import {
  createSavedVerse,
  deleteSavedVerse,
} from "../services/saved-verse-service";

export function useCreateSavedVerse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedVerseInput) =>
      createSavedVerse(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedVerses });
    },
  });
}

export function useDeleteSavedVerse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedVerse(createClient(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedVerses });
    },
  });
}
