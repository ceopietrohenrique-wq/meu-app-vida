"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";

import { useMarkPrayerAsAnswered } from "../mutations/use-prayer-mutations";
import type { Prayer } from "../types/prayer";

const TYPE_LABELS: Record<Prayer["type"], string> = {
  pedido: "Pedido",
  agradecimento: "Agradecimento",
  respondida: "Respondida",
};

export function PrayerItem({
  prayer,
  today,
}: {
  prayer: Prayer;
  today: string;
}) {
  const [answering, setAnswering] = useState(false);
  const markAnswered = useMarkPrayerAsAnswered();

  async function handleMarkAnswered() {
    try {
      await markAnswered.mutateAsync({
        id: prayer.id,
        input: { answeredAt: today },
      });
      toast.success("Oração marcada como respondida.");
      setAnswering(false);
    } catch {
      toast.error("Não foi possível marcar a oração como respondida.");
    }
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-md border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{prayer.description}</p>
        <Badge variant={prayer.type === "respondida" ? "default" : "secondary"}>
          {TYPE_LABELS[prayer.type]}
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Pedido em {prayer.requestedAt}
        {prayer.answeredAt && ` · Respondida em ${prayer.answeredAt}`}
      </p>
      {prayer.type === "pedido" && !answering && (
        <button
          type="button"
          onClick={() => setAnswering(true)}
          className="text-primary self-start text-xs underline"
        >
          Marcar como respondida
        </button>
      )}
      {prayer.type === "pedido" && answering && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleMarkAnswered}
            disabled={markAnswered.isPending}
            className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setAnswering(false)}
            className="text-muted-foreground text-xs"
          >
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}
