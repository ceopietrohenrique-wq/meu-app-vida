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

import { useCreateCategory } from "../mutations/use-category-mutations";
import {
  type CreateCategoryFormValues,
  type CreateCategoryInput,
  createCategorySchema,
} from "../schemas/category-schema";
import type { FinanceViewContext } from "./finance-context-toggle";

export function CreateCategoryDialog({
  defaultContext,
}: {
  defaultContext: FinanceViewContext;
}) {
  const [open, setOpen] = useState(false);
  const createCategory = useCreateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryFormValues, unknown, CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      context: defaultContext === "empresarial" ? "empresarial" : "pessoal",
    },
  });

  async function onSubmit(values: CreateCategoryInput) {
    try {
      await createCategory.mutateAsync(values);
      toast.success("Categoria criada.");
      reset({ name: "", context: values.context });
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a categoria.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Nova categoria
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoryName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="categoryName" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoryContext" className="text-sm font-medium">
              Contexto
            </label>
            <select
              id="categoryContext"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...register("context")}
            >
              <option value="pessoal">Pessoal</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar categoria"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
