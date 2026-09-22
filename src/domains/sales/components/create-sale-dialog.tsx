"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useBusinesses } from "@/domains/business/queries/use-businesses";
import { useCatalogItems } from "@/domains/catalog/queries/use-catalog-items";
import { useCustomers } from "@/domains/crm/queries/use-customers";
import { useAccounts } from "@/domains/finance/queries/use-accounts";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

import { useCreateSale } from "../mutations/use-sale-mutations";
import {
  type CreateSaleFormValues,
  type CreateSaleInput,
  createSaleSchema,
} from "../schemas/sale-schema";

export function CreateSaleDialog({
  businessId,
  today,
}: {
  businessId: string | null;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const createSale = useCreateSale();
  const { data: businesses = [] } = useBusinesses();
  const { data: catalogItems = [] } = useCatalogItems(businessId ?? undefined);
  const { data: customers = [] } = useCustomers(businessId ?? undefined);
  const { data: accounts = [] } = useAccounts();
  const businessAccounts = accounts.filter(
    (a) => a.context === "empresarial" && a.isActive,
  );
  // Gerado uma vez por intenção de envio — protege contra double-submit
  // (CLAUDE.md > Fase 5 > 10): reenviar não duplica venda, estoque nem XP.
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleFormValues, unknown, CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      status: "draft",
      saleDate: today,
      items: [{ catalogItemId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(values: CreateSaleInput) {
    try {
      await createSale.mutateAsync({ input: values, clientRequestId });
      toast.success("Venda registrada.");
      reset({
        status: "draft",
        saleDate: today,
        items: [{ catalogItemId: "", quantity: 1 }],
      });
      setClientRequestId(crypto.randomUUID());
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a venda.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nova venda</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova venda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {businesses.length > 0 && (
            <select
              aria-label="Negócio"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("businessId")}
            >
              <option value="">Sem negócio específico</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Cliente"
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
            {...register("customerId")}
          >
            <option value="">Sem cliente vinculado</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Itens</p>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <select
                  aria-label={`Item ${index + 1}`}
                  className="border-input h-8 flex-1 rounded-lg border bg-transparent px-2.5 text-sm"
                  {...register(`items.${index}.catalogItemId`)}
                >
                  <option value="">Selecione</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  className="w-16"
                  aria-label={`Quantidade do item ${index + 1}`}
                  {...register(`items.${index}.quantity`)}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({ catalogItemId: "", quantity: 1, discountAmount: "" })
              }
            >
              Adicionar item
            </Button>
            {errors.items && (
              <p className="text-destructive text-sm">{errors.items.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleStatus" className="text-sm font-medium">
              Status inicial
            </label>
            <select
              id="saleStatus"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("status")}
            >
              <option value="draft">Rascunho</option>
              <option value="negotiating">Em negociação</option>
              <option value="confirmed">Confirmada</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleAccount" className="text-sm font-medium">
              Conta de destino (opcional — necessária para lançar receita ao
              marcar como paga)
            </label>
            <select
              id="saleAccount"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("accountId")}
            >
              <option value="">Sem reflexo financeiro automático</option>
              {businessAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleDate" className="text-sm font-medium">
              Data
            </label>
            <Input id="saleDate" type="date" {...register("saleDate")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleFees" className="text-sm font-medium">
              Taxas (R$, opcional)
            </label>
            <Input
              id="saleFees"
              type="number"
              step="0.01"
              {...register("fees")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="salePaymentMethod" className="text-sm font-medium">
              Forma de pagamento (opcional)
            </label>
            <Input id="salePaymentMethod" {...register("paymentMethod")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleNotes" className="text-sm font-medium">
              Observações
            </label>
            <Input id="saleNotes" {...register("notes")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Registrar venda"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
