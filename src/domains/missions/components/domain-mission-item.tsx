import { BookOpen, Check, Heart } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import type { DailyMission } from "../utils/build-daily-missions";

const SECTION: Record<string, { href: string; anchor: string }> = {
  weight: { href: "/saude", anchor: "peso" },
  water: { href: "/saude", anchor: "agua" },
  meal: { href: "/saude", anchor: "alimentacao" },
  workout: { href: "/saude", anchor: "treino" },
  walk: { href: "/saude", anchor: "caminhada" },
  devotional: { href: "/espiritual", anchor: "devocional" },
  reading_plan: { href: "/espiritual", anchor: "plano-leitura" },
};

const ICON: Record<string, typeof Heart> = {
  devotional: BookOpen,
  reading_plan: BookOpen,
};

/**
 * Missão de saúde/espiritual na lista "Missões de hoje" da Tela Hoje.
 * Diferente de tarefa/hábito, não tem um botão de concluir aqui — a ação
 * real (registrar peso, log de água, devocional, plano de leitura) já
 * existe em `/saude` ou `/espiritual` e não deve ser duplicada em dois
 * lugares; o item leva direto para a seção certa.
 */
export function DomainMissionItem({ mission }: { mission: DailyMission }) {
  const section = SECTION[mission.type];
  const Icon = ICON[mission.type] ?? Heart;

  return (
    <li>
      <Link
        href={`${section?.href ?? "/"}#${section?.anchor ?? ""}`}
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
            <Icon className="size-3" />
          )}
        </span>
        <span className="flex-1 text-sm">{mission.title}</span>
        <Badge variant="secondary">+{mission.xpReward} XP</Badge>
      </Link>
    </li>
  );
}
