"use client";

import { Flame } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { computeCurrentStreak } from "@/shared/lib/streak";
import { cn } from "@/shared/lib/utils";

import { useLogDevotional } from "../mutations/use-devotional-mutations";
import { useDevotionalForDate } from "../queries/use-devotional-for-date";
import { useDevotionals } from "../queries/use-devotionals";
import { LogDevotionalDialog } from "./log-devotional-dialog";

const CHECKLIST_ITEMS = [
  { key: "readDone", label: "Li a passagem" },
  { key: "reflectionDone", label: "Refleti" },
  { key: "prayerDone", label: "Orei" },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];
type Checklist = Record<ChecklistKey, boolean>;

export function DevotionalCard({ today }: { today: string }) {
  const { data: history = [], isLoading: isLoadingHistory } =
    useDevotionals(today);
  const { data: existing, isLoading: isLoadingToday } =
    useDevotionalForDate(today);
  const logDevotional = useLogDevotional();

  // Estado local do checklist, sincronizado durante a renderização (padrão
  // recomendado pelo React para "ajustar estado quando uma prop/query
  // muda" — https://react.dev/learn/you-might-not-need-an-effect) quando o
  // devocional de hoje carrega/muda. Cliques consecutivos rápidos (marcar
  // os 3 itens em sequência) sempre partem deste estado, nunca do cache
  // assíncrono do React Query — que só reflete o servidor depois do
  // refetch pós-invalidação, o que fazia o segundo clique reverter o
  // primeiro se disparado antes do refetch terminar.
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Checklist>({
    readDone: false,
    reflectionDone: false,
    prayerDone: false,
  });

  const existingSignature = existing ? existing.id : `empty:${today}`;
  if (syncedSignature !== existingSignature) {
    setSyncedSignature(existingSignature);
    setChecklist({
      readDone: existing?.readDone ?? false,
      reflectionDone: existing?.reflectionDone ?? false,
      prayerDone: existing?.prayerDone ?? false,
    });
  }

  const isLoading = isLoadingHistory || isLoadingToday;
  const streak = computeCurrentStreak(
    history.map((d) => d.date),
    "diaria",
    null,
    today,
  );

  // Fila que serializa as chamadas da RPC: cada toggle só é ENVIADO ao
  // banco depois que o anterior terminou. Isso elimina (não só reduz) a
  // corrida de "cliques rápidos" — sem essa fila, dois UPSERTs concorrentes
  // no mesmo dia podiam, em teoria, commitar fora de ordem e o resultado
  // final seria o payload do clique mais antigo, não do mais recente. Com
  // a fila, a ordem de commit é sempre igual à ordem de clique. Correção
  // proporcional ao risco: nenhuma dependência nova, só encadear promises.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  function handleToggle(key: ChecklistKey) {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);

    queueRef.current = queueRef.current.then(async () => {
      try {
        const result = await logDevotional.mutateAsync({
          date: today,
          passage: existing?.passage ?? undefined,
          theme: existing?.theme ?? undefined,
          reflection: existing?.reflection ?? undefined,
          learning: existing?.learning ?? undefined,
          application: existing?.application ?? undefined,
          prayer: existing?.prayer ?? undefined,
          durationMinutes: existing?.durationMinutes ?? undefined,
          notes: existing?.notes ?? undefined,
          readDone: next.readDone,
          reflectionDone: next.reflectionDone,
          prayerDone: next.prayerDone,
        });
        if (result.xpAwarded) {
          toast.success(`Devocional concluído. +${result.xpAmount} XP`);
        }
      } catch {
        toast.error("Não foi possível atualizar o devocional.");
      }
    });
  }

  return (
    <Card id="devocional">
      <CardHeader>
        <CardTitle>Devocional</CardTitle>
        <CardDescription className="flex items-center gap-1">
          {streak > 0 && (
            <>
              <Flame className="size-3.5" /> {streak}{" "}
              {streak === 1 ? "dia seguido" : "dias seguidos"}
            </>
          )}
          {streak === 0 && "Comece hoje"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex gap-1.5">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = checklist[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  aria-pressed={checked}
                  className={cn(
                    "flex-1 rounded-md border py-2 text-xs font-medium",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
        <LogDevotionalDialog today={today} existing={existing ?? null} />
      </CardContent>
    </Card>
  );
}
