"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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

import { useCreateCustomer } from "../mutations/use-customer-mutations";
import {
  type CreateCustomerFormValues,
  type CreateCustomerInput,
  createCustomerSchema,
} from "../schemas/customer-schema";

export function CreateCustomerDialog({
  businessId,
}: {
  businessId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const createCustomer = useCreateCustomer();
  const { data: businesses = [] } = useBusinesses();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerFormValues, unknown, CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      businessId: businessId ?? undefined,
      stage: "possivel_cliente",
    },
  });

  async function onSubmit(values: CreateCustomerInput) {
    try {
      await createCustomer.mutateAsync(values);
      toast.success("Cliente/lead criado.");
      reset({ businessId: businessId ?? undefined, stage: "possivel_cliente" });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o cliente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Novo lead/cliente</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lead/cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="customerName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          {businesses.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerBusiness" className="text-sm font-medium">
                Negócio (opcional)
              </label>
              <select
                id="customerBusiness"
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
            <label htmlFor="customerCompany" className="text-sm font-medium">
              Empresa (opcional)
            </label>
            <Input id="customerCompany" {...register("company")} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerPhone" className="text-sm font-medium">
                Telefone
              </label>
              <Input id="customerPhone" {...register("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerWhatsapp" className="text-sm font-medium">
                WhatsApp
              </label>
              <Input id="customerWhatsapp" {...register("whatsapp")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="customerInstagram"
                className="text-sm font-medium"
              >
                Instagram
              </label>
              <Input id="customerInstagram" {...register("instagram")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerEmail" className="text-sm font-medium">
                Email
              </label>
              <Input id="customerEmail" type="email" {...register("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerSegment" className="text-sm font-medium">
                Segmento
              </label>
              <Input id="customerSegment" {...register("segment")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customerCity" className="text-sm font-medium">
                Cidade
              </label>
              <Input id="customerCity" {...register("city")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerNotes" className="text-sm font-medium">
              Observações
            </label>
            <Input id="customerNotes" {...register("notes")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar lead/cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
