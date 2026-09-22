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

import { useCreateReward } from "../mutations/use-reward-mutations";
import {
  type CreateRewardFormValues,
  type CreateRewardInput,
  createRewardSchema,
} from "../schemas/reward-schema";

export function CreateRewardDialog() {
  const [open, setOpen] = useState(false);
  const createReward = useCreateReward();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRewardFormValues, unknown, CreateRewardInput>({
    resolver: zodResolver(createRewardSchema),
  });

  async function onSubmit(values: CreateRewardInput) {
    try {
      await createReward.mutateAsync(values);
      toast.success("Recompensa criada.");
      reset();
      setOpen(false);
    } catch {
      toast.error("Não foi possível criar a recompensa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Nova recompensa</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova recompensa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rewardName" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="rewardName"
              placeholder="Ex.: Assistir um filme"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rewardCost" className="text-sm font-medium">
              Custo em XP
            </label>
            <Input
              id="rewardCost"
              type="number"
              min={1}
              {...register("xpCost")}
            />
            {errors.xpCost && (
              <p className="text-destructive text-sm">
                {errors.xpCost.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rewardDescription" className="text-sm font-medium">
              Descrição (opcional)
            </label>
            <Input id="rewardDescription" {...register("description")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar recompensa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
