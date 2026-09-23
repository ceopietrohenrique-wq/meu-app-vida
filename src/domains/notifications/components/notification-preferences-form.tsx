"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import { useUpdateNotificationPreferences } from "../mutations/use-notification-preferences-mutations";
import {
  updateNotificationPreferencesSchema,
  type UpdateNotificationPreferencesInput,
} from "../schemas/notification-preferences-schema";
import {
  NOTIFICATION_PRESETS,
  type NotificationPreferences,
  type NotificationPresetKey,
} from "../types/notification-preferences";
import { PushNotificationsToggle } from "./push-notifications-toggle";

// Nem toda categoria tem um gerador automático real ainda (ver
// docs/business-rules.md > Fase 7 > 58). Marcar isso na UI evita sugerir
// uma automação que não existe: `note` só aparece quando a categoria NÃO
// tem lembrete automático (ou tem um mecanismo parcial/diferente).
const CATEGORY_FIELDS = [
  { key: "tasksEnabled", label: "Tarefas", note: null },
  { key: "waterEnabled", label: "Água", note: null },
  {
    key: "dietEnabled",
    label: "Dieta",
    note: "sem lembrete automático ainda",
  },
  { key: "workoutEnabled", label: "Treino", note: null },
  {
    key: "weightEnabled",
    label: "Peso",
    note: "sem lembrete automático ainda",
  },
  { key: "spiritualEnabled", label: "Espiritual", note: null },
  {
    key: "financeEnabled",
    label: "Financeiro",
    note: "alertas de orçamento continuam ativos por conta própria (Fase 4); este toggle ainda não os controla",
  },
  {
    key: "businessEnabled",
    label: "Negócios",
    note: "sem lembrete automático ainda",
  },
] as const satisfies {
  key: keyof UpdateNotificationPreferencesInput;
  label: string;
  note: string | null;
}[];

const PRESET_LABELS: Record<NotificationPresetKey, string> = {
  essencial: "Essencial",
  equilibrado: "Equilibrado",
  intenso: "Intenso",
};

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const updatePreferences = useUpdateNotificationPreferences();
  const { register, handleSubmit, setValue, formState } =
    useForm<UpdateNotificationPreferencesInput>({
      resolver: zodResolver(updateNotificationPreferencesSchema),
      defaultValues: {
        inAppEnabled: preferences.inAppEnabled,
        pushEnabled: preferences.pushEnabled,
        tasksEnabled: preferences.tasksEnabled,
        waterEnabled: preferences.waterEnabled,
        dietEnabled: preferences.dietEnabled,
        workoutEnabled: preferences.workoutEnabled,
        weightEnabled: preferences.weightEnabled,
        spiritualEnabled: preferences.spiritualEnabled,
        financeEnabled: preferences.financeEnabled,
        businessEnabled: preferences.businessEnabled,
        dailySummaryEnabled: preferences.dailySummaryEnabled,
        weeklySummaryEnabled: preferences.weeklySummaryEnabled,
        dailySummaryTime: preferences.dailySummaryTime,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
      },
    });

  function applyPreset(preset: NotificationPresetKey) {
    const values = NOTIFICATION_PRESETS[preset];
    for (const [key, value] of Object.entries(values)) {
      setValue(key as keyof typeof values, value, { shouldDirty: true });
    }
  }

  async function onSubmit(values: UpdateNotificationPreferencesInput) {
    try {
      await updatePreferences.mutateAsync(values);
      toast.success("Preferências de notificação salvas.");
    } catch {
      toast.error("Não foi possível salvar as preferências. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Push</h2>
        <PushNotificationsToggle />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("pushEnabled")} />
          Habilitar envio de lembretes/resumos por push
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("inAppEnabled")} />
          Notificações dentro do app
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Intensidade</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NOTIFICATION_PRESETS) as NotificationPresetKey[]).map(
            (preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {PRESET_LABELS[preset]}
              </Button>
            ),
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Categorias</h2>
        <p className="text-muted-foreground text-xs">
          Tarefas, Água, Treino e Espiritual têm lembretes automáticos reais. As
          demais categorias existem como preferência, mas ainda não geram
          lembrete sozinhas.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {CATEGORY_FIELDS.map(({ key, label, note }) => (
            <label key={key} className="flex flex-col gap-0.5 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" {...register(key)} />
                {label}
              </span>
              {note && (
                <span className="text-muted-foreground text-xs">{note}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Resumos</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("dailySummaryEnabled")} />
          Resumo diário
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Horário do resumo diário
          <input
            type="time"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-32 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3"
            {...register("dailySummaryTime")}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("weeklySummaryEnabled")} />
          Resumo semanal
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Horário silencioso</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("quietHoursEnabled")} />
          Não enviar push fora do horário abaixo
        </label>
        <div className="flex items-center gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Início
            <input
              type="time"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-28 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3"
              {...register("quietHoursStart")}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Fim
            <input
              type="time"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-28 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3"
              {...register("quietHoursEnd")}
            />
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={formState.isSubmitting}
        className="self-start"
      >
        {formState.isSubmitting ? "Salvando…" : "Salvar preferências"}
      </Button>
    </form>
  );
}
