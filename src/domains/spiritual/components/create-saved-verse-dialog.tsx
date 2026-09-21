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
import { Textarea } from "@/shared/components/ui/textarea";

import { useCreateSavedVerse } from "../mutations/use-saved-verse-mutations";
import {
  type CreateSavedVerseFormValues,
  type CreateSavedVerseInput,
  createSavedVerseSchema,
} from "../schemas/saved-verse-schema";

export function CreateSavedVerseDialog() {
  const [open, setOpen] = useState(false);
  const createVerse = useCreateSavedVerse();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSavedVerseFormValues, unknown, CreateSavedVerseInput>({
    resolver: zodResolver(createSavedVerseSchema),
  });

  async function onSubmit(values: CreateSavedVerseInput) {
    try {
      await createVerse.mutateAsync(values);
      toast.success("Versículo salvo.");
      reset({});
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar o versículo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" /> Salvar versículo
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar versículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reference" className="text-sm font-medium">
              Referência
            </label>
            <Input
              id="reference"
              placeholder="Ex.: João 3:16"
              autoFocus
              {...register("reference")}
            />
            {errors.reference && (
              <p className="text-destructive text-sm">
                {errors.reference.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verseBook" className="text-sm font-medium">
                Livro
              </label>
              <Input id="verseBook" {...register("book")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verseChapter" className="text-sm font-medium">
                Capítulo
              </label>
              <Input
                id="verseChapter"
                type="number"
                inputMode="numeric"
                {...register("chapter")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verseStart" className="text-sm font-medium">
                Versículo
              </label>
              <Input
                id="verseStart"
                type="number"
                inputMode="numeric"
                {...register("verseStart")}
              />
            </div>
          </div>
          {(errors.book || errors.chapter || errors.verseStart) && (
            <p className="text-destructive text-sm">
              {errors.book?.message ??
                errors.chapter?.message ??
                errors.verseStart?.message}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="verseNotes" className="text-sm font-medium">
              Texto/notas
            </label>
            <Textarea id="verseNotes" rows={3} {...register("notes")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="verseTags" className="text-sm font-medium">
              Tags (separadas por vírgula)
            </label>
            <Input id="verseTags" {...register("tags")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
