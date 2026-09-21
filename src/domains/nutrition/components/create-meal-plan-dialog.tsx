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

import { useCreateMealPlan } from "../mutations/use-meal-mutations";
import {
  type CreateMealPlanFormValues,
  type CreateMealPlanInput,
  createMealPlanSchema,
} from "../schemas/meal-schema";

export function CreateMealPlanDialog() {
  const [open, setOpen] = useState(false);
  const createMealPlan = useCreateMealPlan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMealPlanFormValues, unknown, CreateMealPlanInput>({
    resolver: zodResolver(createMealPlanSchema),
  });

  async function onSubmit(values: CreateMealPlanInput) {
    try {
      await createMealPlan.mutateAsync(values);
      toast.success("Refeição planejada criada.");
      reset({});
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a refeição planejada.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Nova refeição
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova refeição planejada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mealName" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="mealName"
              placeholder="Ex.: Café da manhã"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mealTime" className="text-sm font-medium">
              Horário (opcional)
            </label>
            <Input id="mealTime" type="time" {...register("time")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mealItems" className="text-sm font-medium">
              Itens (opcional)
            </label>
            <Input
              id="mealItems"
              placeholder="Ex.: Ovos, aveia, fruta"
              {...register("items")}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar refeição"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
