"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useBusinesses } from "@/domains/business/queries/use-businesses";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

import { useCreateCatalogItem } from "../mutations/use-catalog-mutations";
import {
  type CreateCatalogItemFormValues,
  type CreateCatalogItemInput,
  createCatalogItemSchema,
} from "../schemas/catalog-item-schema";

export function CreateCatalogItemDialog({
  businessId,
}: {
  businessId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const createCatalogItem = useCreateCatalogItem();
  const { data: businesses = [] } = useBusinesses();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateCatalogItemFormValues, unknown, CreateCatalogItemInput>({
    resolver: zodResolver(createCatalogItemSchema),
    defaultValues: {
      businessId: businessId ?? undefined,
      type: "produto",
      defaultCost: "0",
      tracksInventory: false,
    },
  });

  const type = useWatch({ control, name: "type" });

  async function onSubmit(values: CreateCatalogItemInput) {
    try {
      await createCatalogItem.mutateAsync(values);
      toast.success("Item de catálogo criado.");
      reset({
        businessId: businessId ?? undefined,
        type: "produto",
        defaultCost: "0",
      });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o item de catálogo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Novo item</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item de catálogo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="catalogName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="catalogName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          {businesses.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalogBusiness" className="text-sm font-medium">
                Negócio (opcional)
              </label>
              <select
                id="catalogBusiness"
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
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="catalogType" className="text-sm font-medium">
              Tipo
            </label>
            <select
              id="catalogType"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("type")}
            >
              <option value="produto">Produto físico</option>
              <option value="servico">Serviço</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalogPrice" className="text-sm font-medium">
                Preço padrão (R$)
              </label>
              <Input
                id="catalogPrice"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register("defaultPrice")}
              />
              {errors.defaultPrice && (
                <p className="text-destructive text-sm">
                  {errors.defaultPrice.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalogCost" className="text-sm font-medium">
                Custo padrão (R$)
              </label>
              <Input
                id="catalogCost"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register("defaultCost")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalogSku" className="text-sm font-medium">
                SKU (opcional)
              </label>
              <Input id="catalogSku" {...register("sku")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="catalogCategory" className="text-sm font-medium">
                Categoria (opcional)
              </label>
              <Input id="catalogCategory" {...register("category")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="catalogDescription" className="text-sm font-medium">
              Descrição (opcional)
            </label>
            <Input id="catalogDescription" {...register("description")} />
          </div>

          {type === "produto" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("tracksInventory")} />
              Controlar estoque deste item
            </label>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
