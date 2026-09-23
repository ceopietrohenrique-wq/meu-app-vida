"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAchievements } from "../queries/use-achievements";
import { ACHIEVEMENT_DEFINITIONS } from "../types/achievement";

export function AchievementsCard() {
  const { data: achievements = [], isLoading } = useAchievements();

  return (
    <Card id="conquistas">
      <CardHeader>
        <CardTitle>Conquistas</CardTitle>
        <CardDescription>
          {achievements.length}/{Object.keys(ACHIEVEMENT_DEFINITIONS).length}{" "}
          desbloqueadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              Object.entries(ACHIEVEMENT_DEFINITIONS) as [
                keyof typeof ACHIEVEMENT_DEFINITIONS,
                (typeof ACHIEVEMENT_DEFINITIONS)[keyof typeof ACHIEVEMENT_DEFINITIONS],
              ][]
            ).map(([key, def]) => {
              const unlocked = achievements.some(
                (a) => a.achievementKey === key,
              );
              return (
                <li
                  key={key}
                  // Fase 8 > Acessibilidade: opacity-40 no texto derrubava
                  // o contraste pra 2.71:1 (abaixo do 4.5:1 do WCAG AA) —
                  // achado real via axe-core. grayscale + fundo diferenciado
                  // já comunica "bloqueada" sem depender só de opacidade no
                  // texto (nem só de cor, que também é regra de Fase 8).
                  className={`rounded-md border px-2.5 py-2 text-center ${
                    unlocked ? "" : "bg-muted/50 grayscale"
                  }`}
                >
                  <p className="text-xs font-medium">{def.title}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {def.description}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
