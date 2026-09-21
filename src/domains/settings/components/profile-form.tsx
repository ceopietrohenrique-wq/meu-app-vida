"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { useUpdateProfile } from "../mutations/use-update-profile";
import {
  type UpdateProfileFormValues,
  type UpdateProfileInput,
  updateProfileSchema,
} from "../schemas/profile-schema";
import type { Profile } from "../types/profile";

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues, unknown, UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name ?? "",
      timezone: profile.timezone,
      weekStart: profile.weekStart,
      currency: profile.currency,
      weeklyXpGoal: profile.weeklyXpGoal,
    },
  });

  async function onSubmit(values: UpdateProfileInput) {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Não foi possível salvar o perfil. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nome
        </label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="timezone" className="text-sm font-medium">
          Fuso horário
        </label>
        <Input
          id="timezone"
          placeholder="America/Sao_Paulo"
          {...register("timezone")}
        />
        {errors.timezone && (
          <p className="text-destructive text-sm">{errors.timezone.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="weekStart" className="text-sm font-medium">
          Início da semana
        </label>
        <select
          id="weekStart"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3"
          {...register("weekStart")}
        >
          {WEEKDAY_LABELS.map((label, value) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.weekStart && (
          <p className="text-destructive text-sm">{errors.weekStart.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className="text-sm font-medium">
          Moeda
        </label>
        <Input id="currency" maxLength={3} {...register("currency")} />
        {errors.currency && (
          <p className="text-destructive text-sm">{errors.currency.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="weeklyXpGoal" className="text-sm font-medium">
          Meta semanal de XP
        </label>
        <Input
          id="weeklyXpGoal"
          type="number"
          min={0}
          step={10}
          {...register("weeklyXpGoal")}
        />
        {errors.weeklyXpGoal && (
          <p className="text-destructive text-sm">
            {errors.weeklyXpGoal.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 self-start">
        {isSubmitting ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
