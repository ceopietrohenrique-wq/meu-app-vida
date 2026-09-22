"use client";

import { useRef } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useRedeemReward } from "../mutations/use-reward-mutations";
import { useWeeklyXpSummary } from "../queries/use-weekly-xp-summary";
import { useRewardRedemptions, useRewards } from "../queries/use-rewards";
import { CreateRewardDialog } from "./create-reward-dialog";

export function RewardsCard() {
  const { data: rewards = [], isLoading } = useRewards();
  const { data: redemptions = [] } = useRewardRedemptions();
  const { data: xpSummary } = useWeeklyXpSummary();
  const redeemReward = useRedeemReward();
  // XP disponível = acumulado (nunca alterado) - já gasto em resgates
  // anteriores (soma imutável, nunca uma coluna de saldo mutável) — mesma
  // filosofia de saldo de conta/estoque das fases anteriores.
  const totalEarned = xpSummary?.totalXp ?? 0;
  const totalSpent = redemptions.reduce(
    (sum, r) => sum + r.xpCostAtRedemption,
    0,
  );
  const availableXp = totalEarned - totalSpent;

  // Guard síncrono contra clique duplo: state do React (isPending) só
  // reflete no próximo render, então um segundo clique disparado antes do
  // primeiro re-render não seria bloqueado pelo `disabled`. O ref é
  // atualizado na hora, fechando essa janela.
  const inFlightRewardIds = useRef(new Set<string>());
  const clientRequestIds = useRef(new Map<string, string>());

  async function handleRedeem(rewardId: string, name: string) {
    if (inFlightRewardIds.current.has(rewardId)) return;
    inFlightRewardIds.current.add(rewardId);

    if (!clientRequestIds.current.has(rewardId)) {
      clientRequestIds.current.set(rewardId, crypto.randomUUID());
    }
    const clientRequestId = clientRequestIds.current.get(rewardId)!;

    try {
      await redeemReward.mutateAsync({ rewardId, clientRequestId });
      toast.success(`"${name}" resgatada.`);
      clientRequestIds.current.delete(rewardId);
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("insuficiente")
          ? error.message
          : "Não foi possível resgatar a recompensa.";
      toast.error(message);
    } finally {
      inFlightRewardIds.current.delete(rewardId);
    }
  }

  return (
    <Card id="recompensas">
      <CardHeader>
        <CardTitle>Recompensas</CardTitle>
        <CardDescription>
          {availableXp} XP disponível para gastar ({totalEarned} acumulado -{" "}
          {totalSpent} já resgatado).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : rewards.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhuma recompensa ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rewards.map((reward) => {
              const available = availableXp >= reward.xpCost;
              return (
                <li
                  key={reward.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{reward.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {reward.xpCost} XP
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!available || redeemReward.isPending}
                    onClick={() => handleRedeem(reward.id, reward.name)}
                  >
                    {available ? "Resgatar" : "Indisponível"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <CreateRewardDialog />
      </CardContent>
    </Card>
  );
}
