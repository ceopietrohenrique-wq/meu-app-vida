"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useLogWater } from "../mutations/use-water-mutations";
import { useWaterToday } from "../queries/use-water-today";
import { WaterQuickAddButtons } from "./water-quick-add-buttons";

function formatLiters(ml: number): string {
  return (ml / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function WaterTrackerCard({ today }: { today: string }) {
  const { data, isLoading } = useWaterToday(today);
  const logWater = useLogWater();
  const [customAmount, setCustomAmount] = useState("");

  const totalMl = data?.totalMl ?? 0;
  const goalMl = data?.settings.dailyGoalMl ?? 2000;
  const progressPercent = Math.min(100, Math.round((totalMl / goalMl) * 100));
  const goalReached = totalMl >= goalMl;

  return (
    <Card id="agua">
      <CardHeader>
        <CardTitle>Água</CardTitle>
        <CardDescription>Meta diária: {formatLiters(goalMl)} L</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span
                  data-testid="water-total"
                  className="text-2xl font-semibold tabular-nums"
                >
                  {formatLiters(totalMl)} L
                </span>
                <span className="text-muted-foreground text-sm">
                  de {formatLiters(goalMl)} L
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {goalReached && (
                <p className="text-muted-foreground text-xs">
                  Meta atingida hoje. 🎉
                </p>
              )}
            </div>

            <WaterQuickAddButtons
              today={today}
              className="grid grid-cols-2 gap-2"
            />

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const amount = Number(customAmount);
                if (Number.isFinite(amount) && amount > 0) {
                  logWater.mutate({
                    amountMl: Math.round(amount),
                    date: today,
                  });
                  setCustomAmount("");
                }
              }}
            >
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Quantidade personalizada (ml)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                aria-label="Quantidade personalizada de água"
              />
              <button
                type="submit"
                disabled={logWater.isPending}
                className="bg-secondary text-secondary-foreground rounded-md px-4 text-sm font-medium disabled:opacity-50"
              >
                Adicionar
              </button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
