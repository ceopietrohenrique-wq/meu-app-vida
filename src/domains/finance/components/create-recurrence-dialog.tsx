"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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

import { useCreateRecurrence } from "../mutations/use-recurrence-mutations";
import { useAccounts } from "../queries/use-accounts";
import { useCategories } from "../queries/use-categories";
import {
  type CreateRecurrenceFormValues,
  type CreateRecurrenceInput,
  createRecurrenceSchema,
} from "../schemas/recurrence-schema";
import type { FinanceViewContext } from "./finance-context-toggle";

export function CreateRecurrenceDialog({
  defaultContext,
  today,
}: {
  defaultContext: FinanceViewContext;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const createRecurrence = useCreateRecurrence();
  const context = defaultContext === "empresarial" ? "empresarial" : "pessoal";
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories(context);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecurrenceFormValues, unknown, CreateRecurrenceInput>({
    resolver: zodResolver(createRecurrenceSchema),
    defaultValues: {
      type: "expense",
      context,
      startsOn: today,
      dayOfMonth: 15,
    },
  });

  const watchedContext = useWatch({ control, name: "context" }) ?? context;
  const accountOptions = accounts.filter(
    (a) => a.context === watchedContext && a.isActive,
  );

  async function onSubmit(values: CreateRecurrenceInput) {
    try {
      await createRecurrence.mutateAsync(values);
      toast.success("Recorrência criada.");
      reset({ type: "expense", context, startsOn: today, dayOfMonth: 15 });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a recorrência.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Nova recorrência</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova recorrência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recName" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="recName"
              placeholder="Ex.: Netflix"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recType" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="recType"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("type")}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recContext" className="text-sm font-medium">
              Contexto
            </label>
            <select
              id="recContext"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("context")}
            >
              <option value="pessoal">Pessoal</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recAccount" className="text-sm font-medium">
              Conta
            </label>
            <select
              id="recAccount"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("accountId")}
            >
              <option value="">Selecione</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.accountId && (
              <p className="text-destructive text-sm">
                {errors.accountId.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recCategory" className="text-sm font-medium">
              Categoria (opcional)
            </label>
            <select
              id="recCategory"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("categoryId")}
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recAmount" className="text-sm font-medium">
              Valor (R$)
            </label>
            <Input
              id="recAmount"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-destructive text-sm">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recDayOfMonth" className="text-sm font-medium">
              Dia do mês
            </label>
            <Input
              id="recDayOfMonth"
              type="number"
              min={1}
              max={31}
              {...register("dayOfMonth")}
            />
            {errors.dayOfMonth && (
              <p className="text-destructive text-sm">
                {errors.dayOfMonth.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recStartsOn" className="text-sm font-medium">
              Início
            </label>
            <Input id="recStartsOn" type="date" {...register("startsOn")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="recInstallments" className="text-sm font-medium">
              Parcelas (opcional — vazio = sem fim, ex.: assinatura)
            </label>
            <Input
              id="recInstallments"
              type="number"
              min={1}
              {...register("totalInstallments")}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar recorrência"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
