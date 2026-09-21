"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

import { useCreateTask } from "../mutations/use-task-mutations";
import {
  type CreateTaskFormValues,
  type CreateTaskInput,
  createTaskSchema,
} from "../schemas/task-schema";

export function CreateTaskDialog({
  defaultDueDate,
}: {
  defaultDueDate: string;
}) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormValues, unknown, CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: "media", xpReward: 10, dueDate: defaultDueDate },
  });

  async function onSubmit(values: CreateTaskInput) {
    try {
      await createTask.mutateAsync(values);
      toast.success("Tarefa criada.");
      reset({ priority: "media", xpReward: 10, dueDate: defaultDueDate });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a tarefa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Nova tarefa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input id="title" autoFocus {...register("title")} />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Data
            </label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar tarefa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
