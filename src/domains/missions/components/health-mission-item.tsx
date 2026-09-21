import { Check, Heart } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import type { DailyMission } from "../utils/build-daily-missions";

const SECTION_ANCHOR: Record<string, string> = {
  weight: "peso",
  water: "agua",
  meal: "alimentacao",
  workout: "treino",
  walk: "caminhada",
};

/**
 * Missão de saúde na lista "Missões de hoje" da Tela Hoje. Diferente de
 * tarefa/hábito, não tem um botão de concluir aqui — a ação real (registrar
 * peso, log de água, marcar refeição, iniciar treino) já existe em
 * `/saude` e não deve ser duplicada em dois lugares; o item leva direto
 * para a seção certa.
 */
export function HealthMissionItem({ mission }: { mission: DailyMission }) {
  const anchor = SECTION_ANCHOR[mission.type] ?? "";

  return (
    <li>
      <Link
        href={`/saude#${anchor}`}
        className="flex items-center gap-3 rounded-md border px-3 py-2.5"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border",
            mission.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground",
          )}
        >
          {mission.completed ? (
            <Check className="size-4" />
          ) : (
            <Heart className="size-3" />
          )}
        </span>
        <span className="flex-1 text-sm">{mission.title}</span>
        <Badge variant="secondary">+{mission.xpReward} XP</Badge>
      </Link>
    </li>
  );
}
