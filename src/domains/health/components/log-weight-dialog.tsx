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

import { useLogWeight } from "../mutations/use-weight-mutations";
import {
  type LogWeightFormValues,
  type LogWeightInput,
  logWeightSchema,
} from "../schemas/weight-schema";

export function LogWeightDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const logWeight = useLogWeight();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogWeightFormValues, unknown, LogWeightInput>({
    resolver: zodResolver(logWeightSchema),
    defaultValues: { date: today },
  });

  async function onSubmit(values: LogWeightInput) {
    try {
      const result = await logWeight.mutateAsync(values);
      toast.success(
        result.xpAwarded
          ? `Peso registrado. +${result.xpAmount} XP`
          : "Peso registrado.",
      );
      reset({ date: today });
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar o peso.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Registrar peso</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar peso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weightKg" className="text-sm font-medium">
              Peso (kg)
            </label>
            <Input
              id="weightKg"
              type="number"
              step="0.1"
              inputMode="decimal"
              autoFocus
              {...register("weightKg")}
            />
            {errors.weightKg && (
              <p className="text-destructive text-sm">
                {errors.weightKg.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="weightDate" className="text-sm font-medium">
              Data
            </label>
            <Input id="weightDate" type="date" {...register("date")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="weightNotes" className="text-sm font-medium">
              Observação (opcional)
            </label>
            <Input id="weightNotes" {...register("notes")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar peso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
