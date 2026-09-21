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

import { useCreateBudget } from "../mutations/use-budget-mutations";
import { useCategories } from "../queries/use-categories";
import {
  type CreateBudgetFormValues,
  type CreateBudgetInput,
  createBudgetSchema,
} from "../schemas/budget-schema";
import type { FinanceViewContext } from "./finance-context-toggle";

export function CreateBudgetDialog({
  defaultContext,
  periodMonth,
}: {
  defaultContext: FinanceViewContext;
  periodMonth: string;
}) {
  const [open, setOpen] = useState(false);
  const createBudget = useCreateBudget();
  const context = defaultContext === "empresarial" ? "empresarial" : "pessoal";
  const { data: categories = [] } = useCategories(context);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBudgetFormValues, unknown, CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: { context, periodMonth },
  });

  async function onSubmit(values: CreateBudgetInput) {
    try {
      await createBudget.mutateAsync(values);
      toast.success("Orçamento criado.");
      reset({ context, periodMonth });
      setOpen(false);
    } catch {
      toast.error(
        "Não foi possível criar o orçamento (já existe um para essa categoria nesse mês?).",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Novo orçamento</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budgetCategory" className="text-sm font-medium">
              Categoria
            </label>
            <select
              id="budgetCategory"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("categoryId")}
            >
              <option value="">Selecione</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-destructive text-sm">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="budgetPeriod" className="text-sm font-medium">
              Mês
            </label>
            <Input
              id="budgetPeriod"
              type="month"
              {...register("periodMonth")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="budgetPlanned" className="text-sm font-medium">
              Valor planejado (R$)
            </label>
            <Input
              id="budgetPlanned"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("plannedAmount")}
            />
            {errors.plannedAmount && (
              <p className="text-destructive text-sm">
                {errors.plannedAmount.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="budgetThresholds" className="text-sm font-medium">
              Alertar em % (opcional — padrão 80,90,100)
            </label>
            <Input
              id="budgetThresholds"
              placeholder="80,90,100"
              {...register("alertThresholds")}
            />
            {errors.alertThresholds && (
              <p className="text-destructive text-sm">
                {errors.alertThresholds.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar orçamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
