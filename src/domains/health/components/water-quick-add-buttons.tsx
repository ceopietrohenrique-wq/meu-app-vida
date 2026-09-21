"use client";

import { toast } from "sonner";

import { useLogWater } from "../mutations/use-water-mutations";

const QUICK_AMOUNTS = [250, 500];

/**
 * Botões de +250ml/+500ml, extraídos para serem reaproveitados tanto no
 * card de Água quanto na linha de atalhos da home de Saúde (CLAUDE.md >
 * Fase 2 > 9) — uma única implementação da ação, sem duplicar a chamada da
 * mutation em dois lugares.
 */
export function WaterQuickAddButtons({
  today,
  className,
  size = "default",
}: {
  today: string;
  className?: string;
  /** "compact" para caber numa linha de atalhos junto com outros botões. */
  size?: "default" | "compact";
}) {
  const logWater = useLogWater();

  async function handleLog(amountMl: number) {
    if (logWater.isPending) return;
    try {
      const result = await logWater.mutateAsync({ amountMl, date: today });
      if (result.xpAwarded) {
        toast.success(`Meta de água atingida. +${result.xpAmount} XP`);
      }
    } catch {
      toast.error("Não foi possível registrar a água.");
    }
  }

  return (
    <div className={className}>
      {QUICK_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={logWater.isPending}
          onClick={() => handleLog(amount)}
          className={
            size === "compact"
              ? "border-input hover:border-primary rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              : "border-input hover:border-primary flex h-14 items-center justify-center rounded-md border text-base font-medium disabled:opacity-50"
          }
        >
          +{amount} ml
        </button>
      ))}
    </div>
  );
}
