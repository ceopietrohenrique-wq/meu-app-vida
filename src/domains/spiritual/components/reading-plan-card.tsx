"use client";

import { Flame } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useCompleteReadingDay } from "../mutations/use-reading-plan-mutations";
import { useReadingPlansWithProgress } from "../queries/use-reading-plans-with-progress";
import { CreateReadingPlanDialog } from "./create-reading-plan-dialog";

export function ReadingPlanCard({ today }: { today: string }) {
  const { data: plans = [], isLoading } = useReadingPlansWithProgress(today);
  const completeDay = useCompleteReadingDay();

  async function handleComplete(readingPlanId: string, dayNumber: number) {
    if (completeDay.isPending) return;
    try {
      const result = await completeDay.mutateAsync({
        readingPlanId,
        dayNumber,
        date: today,
      });
      if (result.xpAwarded) {
        toast.success(`Leitura do dia concluída. +${result.xpAmount} XP`);
      }
    } catch {
      toast.error("Não foi possível concluir a leitura do dia.");
    }
  }

  return (
    <Card id="plano-leitura">
      <CardHeader>
        <CardTitle>Plano de leitura</CardTitle>
        <CardDescription>
          {plans.length > 0
            ? `${plans.length} plano(s) ativo(s)`
            : "Nenhum plano ativo"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="flex flex-col gap-3">
            {plans.map((plan) => {
              const todayCompleted = plan.completedDayNumbers.has(
                plan.progress.currentDay,
              );
              return (
                <li
                  key={plan.id}
                  className="flex flex-col gap-2 rounded-md border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{plan.name}</span>
                    {plan.progress.currentStreak > 0 && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Flame className="size-3" />{" "}
                        {plan.progress.currentStreak}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Dia {plan.progress.currentDay} / {plan.progress.totalDays} ·{" "}
                    {plan.progress.daysCompleted} concluídos ·{" "}
                    {plan.progress.percent}%
                  </p>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${plan.progress.percent}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={completeDay.isPending || todayCompleted}
                    onClick={() =>
                      handleComplete(plan.id, plan.progress.currentDay)
                    }
                    className="bg-primary text-primary-foreground mt-1 rounded-md py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {todayCompleted
                      ? "Leitura de hoje concluída"
                      : `Concluir leitura do dia ${plan.progress.currentDay}`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <CreateReadingPlanDialog today={today} />
      </CardContent>
    </Card>
  );
}
