"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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

import { useSetWeightGoal } from "../mutations/use-weight-mutations";
import {
  type SetWeightGoalFormValues,
  type SetWeightGoalInput,
  setWeightGoalSchema,
} from "../schemas/weight-schema";
import type { WeightGoal } from "../types/weight";

export function WeightGoalDialog({ goal }: { goal: WeightGoal | null }) {
  const [open, setOpen] = useState(false);
  const setWeightGoal = useSetWeightGoal();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetWeightGoalFormValues, unknown, SetWeightGoalInput>({
    resolver: zodResolver(setWeightGoalSchema),
    defaultValues: {
      targetWeightKg: goal?.targetWeightKg,
      targetDate: goal?.targetDate ?? undefined,
    },
  });

  async function onSubmit(values: SetWeightGoalInput) {
    try {
      await setWeightGoal.mutateAsync(values);
      toast.success("Meta de peso salva.");
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar a meta de peso.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            {goal ? "Editar meta" : "Definir meta"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta de peso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="targetWeightKg" className="text-sm font-medium">
              Peso alvo (kg)
            </label>
            <Input
              id="targetWeightKg"
              type="number"
              step="0.1"
              inputMode="decimal"
              autoFocus
              {...register("targetWeightKg")}
            />
            {errors.targetWeightKg && (
              <p className="text-destructive text-sm">
                {errors.targetWeightKg.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="targetDate" className="text-sm font-medium">
              Data alvo (opcional)
            </label>
            <Input id="targetDate" type="date" {...register("targetDate")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar meta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
