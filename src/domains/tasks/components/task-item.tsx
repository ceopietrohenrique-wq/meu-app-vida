"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import {
  useCompleteTask,
  useUncompleteTask,
} from "../mutations/use-task-mutations";
import type { Task } from "../types/task";

export function TaskItem({ task }: { task: Task }) {
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const isDone = task.status === "concluida";
  const isPending = completeTask.isPending || uncompleteTask.isPending;

  async function handleToggle() {
    if (isPending) return;
    try {
      if (isDone) {
        await uncompleteTask.mutateAsync(task.id);
      } else {
        const result = await completeTask.mutateAsync(task.id);
        if (result.xpAwarded) {
          toast.success(`Tarefa concluída. +${result.xpAmount} XP`);
        }
      }
    } catch {
      toast.error("Não foi possível atualizar a tarefa.");
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isDone}
        aria-label={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary text-transparent",
        )}
      >
        <Check className="size-4" />
      </button>
      <span
        className={cn(
          "flex-1 text-sm",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </span>
      <Badge variant="secondary">+{task.xpReward} XP</Badge>
    </li>
  );
}
