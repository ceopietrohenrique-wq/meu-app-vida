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

import { useCreateReadingPlan } from "../mutations/use-reading-plan-mutations";
import {
  type CreateReadingPlanFormValues,
  type CreateReadingPlanInput,
  createReadingPlanSchema,
} from "../schemas/reading-plan-schema";

export function CreateReadingPlanDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const createPlan = useCreateReadingPlan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateReadingPlanFormValues, unknown, CreateReadingPlanInput>({
    resolver: zodResolver(createReadingPlanSchema),
    defaultValues: { startDate: today },
  });

  async function onSubmit(values: CreateReadingPlanInput) {
    try {
      await createPlan.mutateAsync(values);
      toast.success("Plano de leitura criado.");
      reset({ startDate: today });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o plano de leitura.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Novo plano de leitura
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo plano de leitura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="planName" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="planName"
              placeholder="Ex.: Novo Testamento em 90 dias"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startDate" className="text-sm font-medium">
                Início
              </label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="totalDays" className="text-sm font-medium">
                Total de dias
              </label>
              <Input
                id="totalDays"
                type="number"
                inputMode="numeric"
                {...register("totalDays")}
              />
              {errors.totalDays && (
                <p className="text-destructive text-sm">
                  {errors.totalDays.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar plano"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
