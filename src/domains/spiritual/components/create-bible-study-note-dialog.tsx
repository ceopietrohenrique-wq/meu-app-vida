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

import { useCreateBibleStudyNote } from "../mutations/use-bible-study-mutations";
import {
  type CreateBibleStudyNoteFormValues,
  type CreateBibleStudyNoteInput,
  createBibleStudyNoteSchema,
} from "../schemas/bible-study-schema";

export function CreateBibleStudyNoteDialog() {
  const [open, setOpen] = useState(false);
  const createNote = useCreateBibleStudyNote();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<
    CreateBibleStudyNoteFormValues,
    unknown,
    CreateBibleStudyNoteInput
  >({
    resolver: zodResolver(createBibleStudyNoteSchema),
  });

  async function onSubmit(values: CreateBibleStudyNoteInput) {
    try {
      await createNote.mutateAsync(values);
      toast.success("Nota de estudo criada.");
      reset({});
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a nota de estudo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Nova nota de estudo
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova nota de estudo bíblico</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="book" className="text-sm font-medium">
                Livro
              </label>
              <Input id="book" autoFocus {...register("book")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chapter" className="text-sm font-medium">
                Capítulo
              </label>
              <Input
                id="chapter"
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
          {(errors.book || errors.chapter) && (
            <p className="text-destructive text-sm">
              {errors.book?.message ?? errors.chapter?.message}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="personalInterpretation"
              className="text-sm font-medium"
            >
              Interpretação pessoal
            </label>
            <Textarea
              id="personalInterpretation"
              rows={3}
              {...register("personalInterpretation")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="context" className="text-sm font-medium">
              Contexto
            </label>
            <Textarea id="context" rows={2} {...register("context")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="questions" className="text-sm font-medium">
              Dúvidas
            </label>
            <Textarea id="questions" rows={2} {...register("questions")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="noteApplication" className="text-sm font-medium">
              Aplicação
            </label>
            <Textarea
              id="noteApplication"
              rows={2}
              {...register("application")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="crossReferences" className="text-sm font-medium">
              Referências cruzadas (separadas por vírgula)
            </label>
            <Input id="crossReferences" {...register("crossReferences")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="noteTags" className="text-sm font-medium">
              Tags (separadas por vírgula)
            </label>
            <Input id="noteTags" {...register("tags")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar nota"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
