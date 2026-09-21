"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import type { CreateTaskInput } from "../schemas/task-schema";
import {
  completeTask,
  createTask,
  deleteTask,
  uncompleteTask,
} from "../services/tasks-service";

function useInvalidateAfterTaskChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xpSummary });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateAfterTaskChange();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(createClient(), input),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateAfterTaskChange();
  return useMutation({
    mutationFn: (taskId: string) => completeTask(createClient(), taskId),
    onSuccess: invalidate,
  });
}

export function useUncompleteTask() {
  const invalidate = useInvalidateAfterTaskChange();
  return useMutation({
    mutationFn: (taskId: string) => uncompleteTask(createClient(), taskId),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateAfterTaskChange();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(createClient(), taskId),
    onSuccess: invalidate,
  });
}
