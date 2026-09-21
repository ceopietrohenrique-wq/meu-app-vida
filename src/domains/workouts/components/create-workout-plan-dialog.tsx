"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

import { useCreateWorkoutPlan } from "../mutations/use-workout-mutations";
import {
  type CreateWorkoutPlanFormValues,
  type CreateWorkoutPlanInput,
  createWorkoutPlanSchema,
} from "../schemas/workout-schema";

export function CreateWorkoutPlanDialog() {
  const [open, setOpen] = useState(false);
  const createWorkoutPlan = useCreateWorkoutPlan();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkoutPlanFormValues, unknown, CreateWorkoutPlanInput>({
    resolver: zodResolver(createWorkoutPlanSchema),
    defaultValues: { exercises: [{ name: "" }] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  async function onSubmit(values: CreateWorkoutPlanInput) {
    try {
      await createWorkoutPlan.mutateAsync(values);
      toast.success("Plano de treino criado.");
      reset({ exercises: [{ name: "" }] });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o plano de treino.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Novo plano de treino
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo plano de treino</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="planName" className="text-sm font-medium">
              Nome do plano
            </label>
            <Input
              id="planName"
              placeholder="Ex.: Treino A (Peito+Tríceps)"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Exercícios</span>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nome do exercício"
                    aria-label={`Nome do exercício ${index + 1}`}
                    {...register(`exercises.${index}.name` as const)}
                  />
                  <button
                    type="button"
                    aria-label="Remover exercício"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Séries planejadas"
                    type="number"
                    {...register(`exercises.${index}.plannedSets` as const)}
                  />
                  <Input
                    placeholder="Repetições (ex.: 8-12)"
                    {...register(`exercises.${index}.plannedReps` as const)}
                  />
                </div>
                {errors.exercises?.[index]?.name && (
                  <p className="text-destructive text-sm">
                    {errors.exercises[index]?.name?.message}
                  </p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "" })}
            >
              <Plus className="size-4" /> Adicionar exercício
            </Button>
            {errors.exercises?.root && (
              <p className="text-destructive text-sm">
                {errors.exercises.root.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar plano de treino"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
