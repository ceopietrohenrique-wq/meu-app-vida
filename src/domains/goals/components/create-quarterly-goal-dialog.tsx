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

import { useCreateQuarterlyGoal } from "../mutations/use-goal-mutations";
import {
  type CreateQuarterlyGoalFormValues,
  type CreateQuarterlyGoalInput,
  createQuarterlyGoalSchema,
} from "../schemas/goal-schema";

export function CreateQuarterlyGoalDialog() {
  const [open, setOpen] = useState(false);
  const createGoal = useCreateQuarterlyGoal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuarterlyGoalFormValues, unknown, CreateQuarterlyGoalInput>(
    {
      resolver: zodResolver(createQuarterlyGoalSchema),
      defaultValues: { kind: "resultado" },
    },
  );

  async function onSubmit(values: CreateQuarterlyGoalInput) {
    try {
      await createGoal.mutateAsync(values);
      toast.success("Meta trimestral criada.");
      reset({ kind: "resultado" });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a meta trimestral.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Nova meta trimestral</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova meta trimestral</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="goalTitle" className="text-sm font-medium">
              Título
            </label>
            <Input
              id="goalTitle"
              placeholder="Ex.: Validar meu negócio"
              autoFocus
              {...register("title")}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="goalKind" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="goalKind"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("kind")}
            >
              <option value="resultado">Resultado (numérico)</option>
              <option value="processo">Processo (concluir/não concluir)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="goalPeriodStart" className="text-sm font-medium">
                Início
              </label>
              <Input
                id="goalPeriodStart"
                type="date"
                {...register("periodStart")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="goalPeriodEnd" className="text-sm font-medium">
                Fim
              </label>
              <Input
                id="goalPeriodEnd"
                type="date"
                {...register("periodEnd")}
              />
            </div>
          </div>
          {(errors.periodStart || errors.periodEnd) && (
            <p className="text-destructive text-sm">
              {errors.periodStart?.message || errors.periodEnd?.message}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="goalTarget" className="text-sm font-medium">
              Valor alvo (opcional, só para meta de resultado)
            </label>
            <Input
              id="goalTarget"
              type="number"
              step="any"
              {...register("targetValue")}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar meta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
