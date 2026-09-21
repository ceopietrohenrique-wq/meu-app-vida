"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import {
  archiveInboxItem,
  captureToInbox,
  convertInboxItemToTask,
} from "../services/inbox-service";

export function useCaptureToInbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => captureToInbox(createClient(), content),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox }),
  });
}

export function useArchiveInboxItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => archiveInboxItem(createClient(), itemId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox }),
  });
}

export function useConvertInboxItemToTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, title }: { itemId: string; title: string }) =>
      convertInboxItemToTask(createClient(), itemId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    },
  });
}
