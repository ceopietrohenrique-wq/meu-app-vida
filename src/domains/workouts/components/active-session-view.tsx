"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

import {
  useCompleteWorkoutSession,
  useLogExerciseSet,
} from "../mutations/use-workout-mutations";
import { useSessionSets } from "../queries/use-session-sets";
import type { WorkoutExercise, WorkoutSession } from "../types/workout";
import { computeVolume, getLastLoadKg } from "../utils/volume";

/**
 * Tela de execução do treino — poucos campos, botões grandes, pensada para
 * ser usada rapidamente no celular durante o treino (CLAUDE.md > Fase 2 >
 * MOBILE). Registrar séries não gera XP; só concluir o treino gera.
 */
export function ActiveSessionView({
  session,
  exercises,
  onFinished,
}: {
  session: WorkoutSession;
  exercises: WorkoutExercise[];
  onFinished: () => void;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [loadKg, setLoadKg] = useState("");
  const [reps, setReps] = useState("");

  const { data: sets = [] } = useSessionSets(session.id);
  const logSet = useLogExerciseSet();
  const completeSession = useCompleteWorkoutSession();

  const currentExercise = exercises[exerciseIndex];
  const setsForCurrentExercise = sets.filter(
    (s) => s.workoutExerciseId === currentExercise?.id,
  );
  const lastLoad = getLastLoadKg(setsForCurrentExercise);
  const volume = computeVolume(setsForCurrentExercise);

  async function handleLogSet() {
    if (!currentExercise || logSet.isPending) return;
    try {
      await logSet.mutateAsync({
        workoutSessionId: session.id,
        workoutExerciseId: currentExercise.id,
        setOrder: setsForCurrentExercise.length + 1,
        loadKg: loadKg ? Number(loadKg) : null,
        reps: reps ? Number(reps) : null,
      });
    } catch {
      toast.error("Não foi possível registrar a série.");
    }
  }

  async function handleComplete() {
    try {
      const result = await completeSession.mutateAsync(session.id);
      toast.success(
        result.xpAwarded
          ? `Treino concluído. +${result.xpAmount} XP`
          : "Treino concluído.",
      );
      onFinished();
    } catch {
      toast.error("Não foi possível concluir o treino.");
    }
  }

  if (!currentExercise) {
    return (
      <p className="text-muted-foreground text-sm">
        Este plano não tem exercícios cadastrados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          Exercício {exerciseIndex + 1} / {exercises.length}
        </span>
        {lastLoad != null && (
          <span className="text-muted-foreground text-xs">
            Última carga: {lastLoad} kg
          </span>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">{currentExercise.name}</h3>
        {currentExercise.plannedSets && (
          <p className="text-muted-foreground text-sm">
            Planejado: {currentExercise.plannedSets}x
            {currentExercise.plannedReps ?? ""}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {setsForCurrentExercise.map((set, i) => (
          <li key={set.id} className="text-sm tabular-nums">
            Série {i + 1}: {set.loadKg ?? "—"} kg × {set.reps ?? "—"}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="setLoad" className="text-sm font-medium">
            Carga (kg)
          </label>
          <input
            id="setLoad"
            type="number"
            step="0.5"
            inputMode="decimal"
            value={loadKg}
            onChange={(e) => setLoadKg(e.target.value)}
            className="border-input h-12 rounded-md border px-3 text-lg"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="setReps" className="text-sm font-medium">
            Repetições
          </label>
          <input
            id="setReps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="border-input h-12 rounded-md border px-3 text-lg"
          />
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={handleLogSet}
        disabled={logSet.isPending}
        className="h-14 text-base"
      >
        Adicionar série
      </Button>

      <p className="text-muted-foreground text-xs">
        Volume neste exercício: {volume} kg
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={exerciseIndex === 0}
          onClick={() => setExerciseIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={exerciseIndex === exercises.length - 1}
          onClick={() =>
            setExerciseIndex((i) => Math.min(exercises.length - 1, i + 1))
          }
        >
          Próximo
        </Button>
      </div>

      <Button
        type="button"
        variant="default"
        size="lg"
        className="h-14 text-base"
        onClick={handleComplete}
        disabled={completeSession.isPending}
      >
        Concluir treino
      </Button>
    </div>
  );
}
