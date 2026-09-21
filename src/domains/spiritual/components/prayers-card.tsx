"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { usePrayers } from "../queries/use-prayers";
import { CreatePrayerDialog } from "./create-prayer-dialog";
import { PrayerItem } from "./prayer-item";

export function PrayersCard({ today }: { today: string }) {
  const { data: prayers = [], isLoading } = usePrayers();
  const pendingCount = prayers.filter((p) => p.type === "pedido").length;

  return (
    <Card id="oracoes">
      <CardHeader>
        <CardTitle>Orações</CardTitle>
        <CardDescription>
          {prayers.length > 0
            ? `${pendingCount} pedido(s) em aberto de ${prayers.length}`
            : "Nenhuma oração registrada ainda"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {prayers.map((prayer) => (
              <PrayerItem key={prayer.id} prayer={prayer} today={today} />
            ))}
          </ul>
        )}
        <CreatePrayerDialog today={today} />
      </CardContent>
    </Card>
  );
}
