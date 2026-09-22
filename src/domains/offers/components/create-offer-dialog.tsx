"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useBusinesses } from "@/domains/business/queries/use-businesses";
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
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useCreateOffer } from "../mutations/use-offer-mutations";
import {
  type CreateOfferFormValues,
  type CreateOfferInput,
  createOfferSchema,
} from "../schemas/offer-schema";
import { computeOfferPricing } from "../utils/offer-pricing";

export function CreateOfferDialog({
  businessId,
}: {
  businessId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const createOffer = useCreateOffer();
  const { data: businesses = [] } = useBusinesses();
  const { data: catalogItems = [] } = useCatalogItems(businessId ?? undefined);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateOfferFormValues, unknown, CreateOfferInput>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      businessId: businessId ?? undefined,
      discountType: "",
      items: [{ catalogItemId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const discountType = useWatch({ control, name: "discountType" });
  const discountPercent = useWatch({ control, name: "discountPercent" });
  const discountFixed = useWatch({ control, name: "discountFixed" });
  const watchedItems = useWatch({ control, name: "items" });

  const pricing = computeOfferPricing(
    (watchedItems ?? [])
      .filter((i) => i?.catalogItemId)
      .map((i) => {
        const catalogItem = catalogItems.find((c) => c.id === i.catalogItemId);
        return {
          quantity: Number(i.quantity) || 0,
          unitPriceCents: catalogItem?.defaultPriceCents ?? 0,
          unitCostCents: catalogItem?.defaultCostCents ?? 0,
        };
      }),
    discountType === "percent"
      ? { type: "percent", value: Number(discountPercent) || 0 }
      : discountType === "fixed"
        ? {
            type: "fixed",
            value: Math.round((Number(discountFixed) || 0) * 100),
          }
        : null,
  );

  async function onSubmit(values: CreateOfferInput) {
    try {
      await createOffer.mutateAsync(values);
      toast.success("Oferta criada.");
      reset({
        businessId: businessId ?? undefined,
        discountType: "",
        items: [{ catalogItemId: "", quantity: 1 }],
      });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a oferta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Nova oferta/kit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova oferta/kit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="offerName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="offerName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

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
              onClick={() => append({ catalogItemId: "", quantity: 1 })}
            >
              Adicionar item
            </Button>
            {errors.items && (
              <p className="text-destructive text-sm">{errors.items.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="offerDiscountType" className="text-sm font-medium">
              Desconto (opcional)
            </label>
            <select
              id="offerDiscountType"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("discountType")}
            >
              <option value="">Sem desconto</option>
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </div>

          {discountType === "percent" && (
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="% de desconto"
              aria-label="Percentual de desconto"
              {...register("discountPercent")}
            />
          )}
          {discountType === "fixed" && (
            <Input
              type="number"
              step="0.01"
              placeholder="Desconto em R$"
              aria-label="Desconto em reais"
              {...register("discountFixed")}
            />
          )}

          <div className="bg-muted rounded-md p-3 text-sm">
            <p>
              Soma individual: {formatCurrencyBRL(pricing.individualSumCents)}
            </p>
            <p>Desconto: {formatCurrencyBRL(pricing.discountCents)}</p>
            <p>Preço final: {formatCurrencyBRL(pricing.finalPriceCents)}</p>
            <p>
              Custo estimado: {formatCurrencyBRL(pricing.estimatedCostCents)}
            </p>
            <p>
              Lucro estimado: {formatCurrencyBRL(pricing.estimatedProfitCents)}
            </p>
            <p>
              Margem estimada:{" "}
              {pricing.estimatedMarginPercent === null
                ? "—"
                : `${pricing.estimatedMarginPercent.toFixed(1)}%`}
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar oferta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
