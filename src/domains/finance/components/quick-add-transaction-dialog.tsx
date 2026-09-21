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

import { useCreateTransaction } from "../mutations/use-transaction-mutations";
import { useAccounts } from "../queries/use-accounts";
import { useCategories } from "../queries/use-categories";
import {
  type CreateTransactionFormValues,
  type CreateTransactionInput,
  createTransactionSchema,
} from "../schemas/transaction-schema";
import type { FinanceViewContext } from "./finance-context-toggle";

const TYPE_LABEL: Record<string, string> = {
  expense: "Gasto",
  income: "Receita",
  transfer: "Transferência",
};

/**
 * Registro rápido (CLAUDE.md > Fase 4 > 13): poucos campos, um gasto simples
 * cabe em poucos segundos. Categoria/pagamento/observação ficam opcionais.
 */
export function QuickAddTransactionDialog({
  today,
  viewContext,
}: {
  today: string;
  viewContext: FinanceViewContext;
}) {
  const [open, setOpen] = useState(false);
  // Gerado uma vez por "intenção de envio" (não a cada clique/re-render) e
  // reenviado em toda tentativa daquele mesmo formulário — é o que torna o
  // envio seguro contra double-submit (clique duplo, retry de rede): a RPC
  // nunca cria uma segunda transação para a mesma chave (ver
  // transaction-service.ts). Um novo valor só é gerado após um envio bem
  // sucedido, para a PRÓXIMA transação.
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const createTransaction = useCreateTransaction();
  const { data: accounts = [] } = useAccounts();

  const defaultContext =
    viewContext === "empresarial" ? "empresarial" : "pessoal";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionFormValues, unknown, CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "expense",
      context: defaultContext,
      transactionDate: today,
    },
  });

  const type = useWatch({ control, name: "type" });
  const context = useWatch({ control, name: "context" }) ?? defaultContext;
  const { data: categories = [] } = useCategories(context);

  const accountOptions = accounts.filter(
    (a) => a.context === context && a.isActive,
  );

  async function onSubmit(values: CreateTransactionInput) {
    try {
      await createTransaction.mutateAsync({ input: values, clientRequestId });
      toast.success("Transação registrada.");
      reset({
        type: "expense",
        context: defaultContext,
        transactionDate: today,
      });
      setClientRequestId(crypto.randomUUID());
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a transação.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Registrar</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="txType" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="txType"
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
            <label htmlFor="txAmount" className="text-sm font-medium">
              Valor (R$)
            </label>
            <Input
              id="txAmount"
              type="number"
              step="0.01"
              inputMode="decimal"
              autoFocus
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-destructive text-sm">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="txContext" className="text-sm font-medium">
              Contexto
            </label>
            <select
              id="txContext"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("context")}
            >
              <option value="pessoal">Pessoal</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="txAccount" className="text-sm font-medium">
              Conta
            </label>
            <select
              id="txAccount"
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

          {type === "transfer" && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="txTransferAccount"
                className="text-sm font-medium"
              >
                Conta de destino
              </label>
              <select
                id="txTransferAccount"
                className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
                {...register("transferAccountId")}
              >
                <option value="">Selecione</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {errors.transferAccountId && (
                <p className="text-destructive text-sm">
                  {errors.transferAccountId.message}
                </p>
              )}
            </div>
          )}

          {type !== "transfer" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="txCategory" className="text-sm font-medium">
                Categoria (opcional)
              </label>
              <select
                id="txCategory"
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
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="txDescription" className="text-sm font-medium">
              Descrição
            </label>
            <Input id="txDescription" {...register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="txDate" className="text-sm font-medium">
              Data
            </label>
            <Input id="txDate" type="date" {...register("transactionDate")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
