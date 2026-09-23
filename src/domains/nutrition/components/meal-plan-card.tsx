"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { useMealPlansWithStatus } from "../queries/use-meal-plans-with-status";
import { useWeeklyAdherence } from "../queries/use-weekly-adherence";
import { CreateMealPlanDialog } from "./create-meal-plan-dialog";
import { MealItem } from "./meal-item";

export function MealPlanCard({ today }: { today: string }) {
  const { data: meals, isLoading } = useMealPlansWithStatus(today);
  const { data: adherence } = useWeeklyAdherence(today);

  const completedToday = (meals ?? []).filter(
    (m) => m.statusToday === "realizada",
  ).length;

  return (
    <Card id="alimentacao">
      <CardHeader>
        <CardTitle>Alimentação</CardTitle>
        <CardDescription>
          {meals && meals.length > 0
            ? `${completedToday} / ${meals.length} refeições hoje`
            : "Nenhuma refeição planejada ainda"}
          {adherence?.adherenceRate != null &&
            ` · Adesão da semana: ${adherence.daysWithMeal} / ${adherence.totalDays} dias`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {adherence && adherence.strip.length > 0 && (
          <div className="flex justify-between gap-1">
            {adherence.strip.map((day) => (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={day.date}
              >
                <span className="text-muted-foreground text-[10px]">
                  {format(parseISO(day.date), "EEEEE", { locale: ptBR })}
                </span>
                <div
                  role="img"
                  className={cn(
                    "size-5 rounded-full border",
                    day.completed
                      ? "border-primary bg-primary"
                      : "border-muted bg-muted",
                  )}
                  aria-label={
                    day.completed
                      ? `${day.date}: refeição realizada`
                      : `${day.date}: sem refeição realizada`
                  }
                />
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(meals ?? []).map((meal) => (
              <MealItem key={meal.id} meal={meal} today={today} />
            ))}
          </ul>
        )}
        <CreateMealPlanDialog />
      </CardContent>
    </Card>
  );
}
