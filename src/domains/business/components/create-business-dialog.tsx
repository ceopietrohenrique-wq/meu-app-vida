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

import { useCreateBusiness } from "../mutations/use-business-mutations";
import {
  type CreateBusinessFormValues,
  type CreateBusinessInput,
  createBusinessSchema,
} from "../schemas/business-schema";

export function CreateBusinessDialog() {
  const [open, setOpen] = useState(false);
  const createBusiness = useCreateBusiness();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessFormValues, unknown, CreateBusinessInput>({
    resolver: zodResolver(createBusinessSchema),
  });

  async function onSubmit(values: CreateBusinessInput) {
    try {
      await createBusiness.mutateAsync(values);
      toast.success("Negócio criado.");
      reset();
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o negócio.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Novo negócio</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="businessName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessSegment" className="text-sm font-medium">
              Segmento (opcional)
            </label>
            <Input
              id="businessSegment"
              placeholder="Ex.: sites, plaquinhas Google, serviços digitais"
              {...register("segment")}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar negócio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
