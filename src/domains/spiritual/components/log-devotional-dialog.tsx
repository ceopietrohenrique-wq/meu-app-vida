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
import { Textarea } from "@/shared/components/ui/textarea";

import { useLogDevotional } from "../mutations/use-devotional-mutations";
import {
  type LogDevotionalFormValues,
  type LogDevotionalInput,
  logDevotionalSchema,
} from "../schemas/devotional-schema";
import type { Devotional } from "../types/devotional";

export function LogDevotionalDialog({
  today,
  existing,
}: {
  today: string;
  existing: Devotional | null;
}) {
  const [open, setOpen] = useState(false);
  const logDevotional = useLogDevotional();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LogDevotionalFormValues, unknown, LogDevotionalInput>({
    resolver: zodResolver(logDevotionalSchema),
    values: {
      date: today,
      passage: existing?.passage ?? undefined,
      theme: existing?.theme ?? undefined,
      reflection: existing?.reflection ?? undefined,
      learning: existing?.learning ?? undefined,
      application: existing?.application ?? undefined,
      prayer: existing?.prayer ?? undefined,
      durationMinutes: existing?.durationMinutes ?? undefined,
      notes: existing?.notes ?? undefined,
      readDone: existing?.readDone ?? false,
      reflectionDone: existing?.reflectionDone ?? false,
      prayerDone: existing?.prayerDone ?? false,
    },
  });

  async function onSubmit(values: LogDevotionalInput) {
    try {
      const result = await logDevotional.mutateAsync(values);
      toast.success(
        result.xpAwarded
          ? `Devocional salvo. +${result.xpAmount} XP`
          : "Devocional salvo.",
      );
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar o devocional.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            {existing ? "Editar devocional" : "Registrar devocional"}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devocional de hoje</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="passage" className="text-sm font-medium">
              Passagem
            </label>
            <Input
              id="passage"
              placeholder="Ex.: Salmos 23"
              {...register("passage")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="theme" className="text-sm font-medium">
              Tema
            </label>
            <Input id="theme" {...register("theme")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reflection" className="text-sm font-medium">
              Reflexão
            </label>
            <Textarea id="reflection" rows={3} {...register("reflection")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="learning" className="text-sm font-medium">
              Aprendizado
            </label>
            <Textarea id="learning" rows={2} {...register("learning")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="application" className="text-sm font-medium">
              Aplicação
            </label>
            <Textarea id="application" rows={2} {...register("application")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer" className="text-sm font-medium">
              Oração
            </label>
            <Textarea id="prayer" rows={2} {...register("prayer")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="durationMinutes" className="text-sm font-medium">
              Tempo (minutos, opcional)
            </label>
            <Input
              id="durationMinutes"
              type="number"
              inputMode="numeric"
              {...register("durationMinutes")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="devotionalNotes" className="text-sm font-medium">
              Observações
            </label>
            <Textarea id="devotionalNotes" rows={2} {...register("notes")} />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-md border p-3">
            <legend className="text-sm font-medium">Checklist</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("readDone")} /> Li a passagem
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("reflectionDone")} /> Refleti
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("prayerDone")} /> Orei
            </label>
          </fieldset>
          {errors.durationMinutes && (
            <p className="text-destructive text-sm">
              {errors.durationMinutes.message}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar devocional"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
