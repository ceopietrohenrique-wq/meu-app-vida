"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useCatalogItems } from "@/domains/catalog/queries/use-catalog-items";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

import { useCreateInventoryMovement } from "../mutations/use-inventory-mutations";
import {
  type CreateInventoryMovementFormValues,
  type CreateInventoryMovementInput,
  createInventoryMovementSchema,
} from "../schemas/inventory-movement-schema";

export function LogInventoryMovementDialog({
  businessId,
}: {
  businessId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { data: catalogItems = [] } = useCatalogItems(businessId ?? undefined);
  const trackedItems = catalogItems.filter((i) => i.tracksInventory);
  const createMovement = useCreateInventoryMovement();
  // Gerado uma vez por intenção de envio — protege contra double-submit
  // (mesmo padrão de idempotência do Financeiro/Vendas).
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<
    CreateInventoryMovementFormValues,
    unknown,
    CreateInventoryMovementInput
  >({
    resolver: zodResolver(createInventoryMovementSchema),
    defaultValues: { type: "entrada" },
  });

  const type = useWatch({ control, name: "type" });

  async function onSubmit(values: CreateInventoryMovementInput) {
    try {
      await createMovement.mutateAsync({ input: values, clientRequestId });
      toast.success("Movimentação registrada.");
      reset({ type: "entrada" });
      setClientRequestId(crypto.randomUUID());
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a movimentação.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Movimentar estoque</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="movementItem" className="text-sm font-medium">
              Item
            </label>
            <select
              id="movementItem"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("catalogItemId")}
            >
              <option value="">Selecione</option>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {errors.catalogItemId && (
              <p className="text-destructive text-sm">
                {errors.catalogItemId.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="movementType" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="movementType"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("type")}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>

          {type === "ajuste" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked {...register("increase")} />
              Aumentar estoque (desmarque para diminuir)
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="movementQuantity" className="text-sm font-medium">
              Quantidade
            </label>
            <Input
              id="movementQuantity"
              type="number"
              min={1}
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="text-destructive text-sm">
                {errors.quantity.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="movementNotes" className="text-sm font-medium">
              Observação (opcional)
            </label>
            <Input id="movementNotes" {...register("notes")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Registrar movimentação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
