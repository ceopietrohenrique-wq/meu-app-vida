"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

import { useSaveBmiCalculation } from "../mutations/use-bmi-mutations";
import { BMI_CATEGORY_LABELS, calculateBmi } from "../utils/bmi";

export function BmiCalculatorCard({
  defaultHeightCm,
}: {
  defaultHeightCm?: number | null;
}) {
  const [savedMessage, setSavedMessage] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState(
    defaultHeightCm != null ? String(defaultHeightCm) : "",
  );
  const saveBmi = useSaveBmiCalculation();

  const result = useMemo(() => {
    if (!weightKg || !heightCm) return null;
    try {
      return calculateBmi(Number(weightKg), Number(heightCm));
    } catch {
      return null;
    }
  }, [weightKg, heightCm]);

  async function handleSave() {
    if (!weightKg || !heightCm) return;
    try {
      await saveBmi.mutateAsync({
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
      });
      setSavedMessage(true);
      toast.success("Cálculo de IMC salvo.");
    } catch {
      toast.error("Não foi possível salvar o cálculo.");
    }
  }

  return (
    <Card id="imc">
      <CardHeader>
        <CardTitle>Calculadora de IMC</CardTitle>
        <CardDescription>
          IMC é um indicador geral e não mede diretamente composição corporal —
          não é um diagnóstico médico.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bmiWeightKg" className="text-sm font-medium">
              Peso (kg)
            </label>
            <Input
              id="bmiWeightKg"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => {
                setWeightKg(e.target.value);
                setSavedMessage(false);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bmiHeightCm" className="text-sm font-medium">
              Altura (cm)
            </label>
            <Input
              id="bmiHeightCm"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => {
                setHeightCm(e.target.value);
                setSavedMessage(false);
              }}
            />
          </div>
        </div>

        {result && (
          <div className="bg-muted flex flex-col items-center gap-1 rounded-md p-4 text-center">
            <span className="text-3xl font-semibold tabular-nums">
              {result.bmi}
            </span>
            <span className="text-sm font-medium">
              {BMI_CATEGORY_LABELS[result.category]}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveBmi.isPending}
              className="text-muted-foreground mt-2 text-xs underline disabled:opacity-50"
            >
              Salvar este cálculo no histórico
            </button>
            {savedMessage && (
              <span className="text-muted-foreground text-xs">Salvo.</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
