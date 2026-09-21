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
import { cn } from "@/shared/lib/utils";

import { useCreateHabit } from "../mutations/use-habit-mutations";
import {
  type CreateHabitFormValues,
  type CreateHabitInput,
  createHabitSchema,
} from "../schemas/habit-schema";

const WEEKDAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

export function CreateHabitDialog() {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"diaria" | "dias_da_semana">(
    "diaria",
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const createHabit = useCreateHabit();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateHabitFormValues, unknown, CreateHabitInput>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: { frequency: "diaria", xpReward: 10 },
  });

  function toggleDay(day: number) {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    setDaysOfWeek(next);
    setValue("daysOfWeek", next);
  }

  async function onSubmit(values: CreateHabitInput) {
    try {
      await createHabit.mutateAsync(values);
      toast.success("Hábito criado.");
      reset({ frequency: "diaria", xpReward: 10 });
      setFrequency("diaria");
      setDaysOfWeek([]);
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar o hábito.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Novo hábito
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo hábito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Nome
            </label>
            <Input id="name" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Frequência</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={frequency === "diaria" ? "default" : "outline"}
                onClick={() => {
                  setFrequency("diaria");
                  setValue("frequency", "diaria");
                }}
              >
                Todo dia
              </Button>
              <Button
                type="button"
                size="sm"
                variant={frequency === "dias_da_semana" ? "default" : "outline"}
                onClick={() => {
                  setFrequency("dias_da_semana");
                  setValue("frequency", "dias_da_semana");
                }}
              >
                Dias específicos
              </Button>
            </div>
          </div>

          {frequency === "dias_da_semana" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-xs font-medium",
                      daysOfWeek.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground",
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {errors.daysOfWeek && (
                <p className="text-destructive text-sm">
                  {errors.daysOfWeek.message}
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar hábito"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
