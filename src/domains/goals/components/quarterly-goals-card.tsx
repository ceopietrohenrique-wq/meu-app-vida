"use client";

import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  useSetGoalCompleted,
  useUpdateGoalProgress,
} from "../mutations/use-goal-mutations";
import { useQuarterlyGoals } from "../queries/use-quarterly-goals";
import { CreateQuarterlyGoalDialog } from "./create-quarterly-goal-dialog";

export function QuarterlyGoalsCard() {
  const { data: goals = [], isLoading } = useQuarterlyGoals();
  const updateProgress = useUpdateGoalProgress();
  const setCompleted = useSetGoalCompleted();

  async function handleProgressBlur(goalId: string, value: string) {
    const parsed = value.trim() === "" ? undefined : Number(value);
    try {
      await updateProgress.mutateAsync({ goalId, currentValue: parsed });
    } catch {
      toast.error("Não foi possível atualizar o progresso.");
    }
  }

  async function handleToggleCompleted(goalId: string, isCompleted: boolean) {
    try {
      await setCompleted.mutateAsync({ goalId, isCompleted: !isCompleted });
      if (!isCompleted) toast.success("Meta trimestral concluída!");
    } catch {
      toast.error("Não foi possível atualizar a meta.");
    }
  }

  return (
    <Card id="metas-trimestrais">
      <CardHeader>
        <CardTitle>Metas trimestrais</CardTitle>
        <CardDescription>Grandes objetivos de ~90 dias.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : goals.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma meta trimestral ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p
                    className={`text-sm font-medium ${goal.isCompleted ? "text-muted-foreground line-through" : ""}`}
                  >
                    {goal.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {goal.periodStart} – {goal.periodEnd}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {goal.kind === "resultado" && (
                    <Input
                      type="number"
                      step="any"
                      className="w-24"
                      aria-label={`Progresso de ${goal.title}`}
                      defaultValue={goal.currentValue ?? ""}
                      onBlur={(e) =>
                        handleProgressBlur(goal.id, e.target.value)
                      }
                      placeholder={
                        goal.targetValue !== null ? `/ ${goal.targetValue}` : ""
                      }
                    />
                  )}
                  <Button
                    size="sm"
                    variant={goal.isCompleted ? "outline" : "default"}
                    onClick={() =>
                      handleToggleCompleted(goal.id, goal.isCompleted)
                    }
                  >
                    {goal.isCompleted ? "Reabrir" : "Concluir"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <CreateQuarterlyGoalDialog />
      </CardContent>
    </Card>
  );
}
