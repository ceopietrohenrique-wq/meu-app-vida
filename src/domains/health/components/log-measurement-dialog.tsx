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

import { useCreateMeasurement } from "../mutations/use-measurement-mutations";
import {
  type CreateMeasurementFormValues,
  type CreateMeasurementInput,
  createMeasurementSchema,
} from "../schemas/measurement-schema";

const FIELDS: { name: keyof CreateMeasurementFormValues; label: string }[] = [
  { name: "waistCm", label: "Cintura (cm)" },
  { name: "hipCm", label: "Quadril (cm)" },
  { name: "chestCm", label: "Peito (cm)" },
  { name: "armCm", label: "Braço (cm)" },
  { name: "thighCm", label: "Coxa (cm)" },
];

export function LogMeasurementDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const createMeasurement = useCreateMeasurement();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMeasurementFormValues, unknown, CreateMeasurementInput>({
    resolver: zodResolver(createMeasurementSchema),
    defaultValues: { date: today },
  });

  async function onSubmit(values: CreateMeasurementInput) {
    try {
      await createMeasurement.mutateAsync(values);
      toast.success("Medidas registradas.");
      reset({ date: today });
      setOpen(false);
    } catch {
      toast.error("Não foi possível registrar as medidas.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Registrar medidas
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Medidas corporais</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="measurementDate" className="text-sm font-medium">
              Data
            </label>
            <Input id="measurementDate" type="date" {...register("date")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                </label>
                <Input
                  id={field.name}
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  {...register(field.name)}
                />
              </div>
            ))}
          </div>
          {errors.waistCm && (
            <p className="text-destructive text-sm">{errors.waistCm.message}</p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar medidas"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
