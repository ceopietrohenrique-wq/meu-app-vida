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

import { useLogWalk } from "../mutations/use-walk-mutations";
import {
  type LogWalkFormValues,
  type LogWalkInput,
  logWalkSchema,
} from "../schemas/walk-schema";

export function LogWalkDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const logWalk = useLogWalk();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogWalkFormValues, unknown, LogWalkInput>({
    resolver: zodResolver(logWalkSchema),
    defaultValues: { date: today },
  });

  async function onSubmit(values: LogWalkInput) {
    try {
      const result = await logWalk.mutateAsync(values);
      toast.success(
        result.xpAwarded
          ? `Caminhada registrada. +${result.xpAmount} XP`
          : "Caminhada registrada.",
      );
      reset({ date: today });
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a caminhada.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Registrar caminhada
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar caminhada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="durationMinutes" className="text-sm font-medium">
              Duração (minutos)
            </label>
            <Input
              id="durationMinutes"
              type="number"
              inputMode="numeric"
              autoFocus
              {...register("durationMinutes")}
            />
            {errors.durationMinutes && (
              <p className="text-destructive text-sm">
                {errors.durationMinutes.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="distanceKm" className="text-sm font-medium">
              Distância (km, opcional)
            </label>
            <Input
              id="distanceKm"
              type="number"
              step="0.1"
              inputMode="decimal"
              {...register("distanceKm")}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar caminhada"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
