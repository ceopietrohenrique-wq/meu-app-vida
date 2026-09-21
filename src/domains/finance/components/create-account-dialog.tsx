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

import { useCreateAccount } from "../mutations/use-account-mutations";
import {
  type CreateAccountFormValues,
  type CreateAccountInput,
  createAccountSchema,
} from "../schemas/account-schema";
import type { FinanceViewContext } from "./finance-context-toggle";

const TYPE_LABEL: Record<string, string> = {
  carteira: "Carteira",
  conta_bancaria: "Conta bancária",
  cartao: "Cartão",
  caixa_empresa: "Caixa da empresa",
  outra: "Outra",
};

export function CreateAccountDialog({
  defaultContext,
}: {
  defaultContext: FinanceViewContext;
}) {
  const [open, setOpen] = useState(false);
  const createAccount = useCreateAccount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormValues, unknown, CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      type: "conta_bancaria",
      context: defaultContext === "empresarial" ? "empresarial" : "pessoal",
      initialBalance: "0",
    },
  });

  async function onSubmit(values: CreateAccountInput) {
    try {
      await createAccount.mutateAsync(values);
      toast.success("Conta criada.");
      reset();
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Nova conta</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="accountName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="accountName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="accountType" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="accountType"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("type")}
            >
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="accountContext" className="text-sm font-medium">
              Contexto
            </label>
            <select
              id="accountContext"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("context")}
            >
              <option value="pessoal">Pessoal</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="accountInitialBalance"
              className="text-sm font-medium"
            >
              Saldo inicial (opcional)
            </label>
            <Input
              id="accountInitialBalance"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("initialBalance")}
            />
            {errors.initialBalance && (
              <p className="text-destructive text-sm">
                {errors.initialBalance.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar conta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
