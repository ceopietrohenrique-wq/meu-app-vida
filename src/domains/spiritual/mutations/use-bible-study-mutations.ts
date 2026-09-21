"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateBibleStudyNoteInput } from "../schemas/bible-study-schema";
import {
  createBibleStudyNote,
  deleteBibleStudyNote,
} from "../services/bible-study-service";

export function useCreateBibleStudyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBibleStudyNoteInput) =>
      createBibleStudyNote(createClient(), input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bibleStudyNotes });
    },
  });
}

export function useDeleteBibleStudyNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBibleStudyNote(createClient(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bibleStudyNotes });
    },
  });
}
