"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useStartWorkoutSession } from "../mutations/use-workout-mutations";
import { useWorkoutExercises } from "../queries/use-workout-exercises";
import { useWorkoutPlans } from "../queries/use-workout-plans";
import type { WorkoutSession } from "../types/workout";
import { ActiveSessionView } from "./active-session-view";
import { CreateWorkoutPlanDialog } from "./create-workout-plan-dialog";

export function WorkoutSection({ today }: { today: string }) {
  const { data: plans, isLoading } = useWorkoutPlans();
  const startSession = useStartWorkoutSession();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    null,
  );
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const { data: exercises = [] } = useWorkoutExercises(activePlanId);

  async function handleStart(workoutPlanId: string) {
    try {
      const session = await startSession.mutateAsync({
        workoutPlanId,
        date: today,
      });
      setActiveSession(session);
      setActivePlanId(workoutPlanId);
    } catch {
      toast.error("Não foi possível iniciar o treino.");
    }
  }

  if (activeSession) {
    return (
      <Card id="treino">
        <CardHeader>
          <CardTitle>Treino em andamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ActiveSessionView
            session={activeSession}
            exercises={exercises}
            onFinished={() => {
              setActiveSession(null);
              setActivePlanId(null);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="treino">
      <CardHeader>
        <CardTitle>Treino</CardTitle>
        <CardDescription>
          {plans && plans.length > 0
            ? "Escolha um plano para iniciar o treino."
            : "Crie um plano de treino para começar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(plans ?? []).map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5"
              >
                <div>
                  <span className="text-sm font-medium">{plan.name}</span>
                  {plan.muscleGroups && (
                    <p className="text-muted-foreground text-xs">
                      {plan.muscleGroups}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleStart(plan.id)}
                  disabled={startSession.isPending}
                  className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Iniciar treino
                </button>
              </li>
            ))}
          </ul>
        )}
        <CreateWorkoutPlanDialog />
      </CardContent>
    </Card>
  );
}
