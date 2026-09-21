"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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

import { useCreatePrayer } from "../mutations/use-prayer-mutations";
import {
  type CreatePrayerFormValues,
  type CreatePrayerInput,
  createPrayerSchema,
} from "../schemas/prayer-schema";

const TYPE_OPTIONS: { value: "pedido" | "agradecimento"; label: string }[] = [
  { value: "pedido", label: "Pedido" },
  { value: "agradecimento", label: "Agradecimento" },
];

export function CreatePrayerDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"pedido" | "agradecimento">("pedido");
  const createPrayer = useCreatePrayer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePrayerFormValues, unknown, CreatePrayerInput>({
    resolver: zodResolver(createPrayerSchema),
    defaultValues: { type: "pedido", requestedAt: today },
  });

  async function onSubmit(values: CreatePrayerInput) {
    try {
      await createPrayer.mutateAsync(values);
      toast.success("Oração registrada.");
      reset({ type: "pedido", requestedAt: today });
      setType("pedido");
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar a oração.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" /> Registrar oração
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar oração</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Tipo</span>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={type === option.value ? "default" : "outline"}
                  onClick={() => {
                    setType(option.value);
                    setValue("type", option.value);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayerDescription" className="text-sm font-medium">
              Descrição
            </label>
            <Input
              id="prayerDescription"
              autoFocus
              {...register("description")}
            />
            {errors.description && (
              <p className="text-destructive text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="requestedAt" className="text-sm font-medium">
              Data
            </label>
            <Input id="requestedAt" type="date" {...register("requestedAt")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar oração"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
