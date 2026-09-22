"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatCurrencyBRL } from "@/shared/lib/money";

import { useSaveWeeklyReview } from "../mutations/use-weekly-review-mutations";
import { useWeeklyReviewData } from "../queries/use-weekly-review";

export function WeeklyReviewDialog({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useWeeklyReviewData(weekStart);
  const saveReview = useSaveWeeklyReview(weekStart);

  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidntWork, setWhatDidntWork] = useState("");
  const [improvement, setImprovement] = useState("");
  const [nextWeekPriority, setNextWeekPriority] = useState("");

  function syncFromSaved() {
    setWhatWorked(data?.savedReview?.whatWorked ?? "");
    setWhatDidntWork(data?.savedReview?.whatDidntWork ?? "");
    setImprovement(data?.savedReview?.improvement ?? "");
    setNextWeekPriority(data?.savedReview?.nextWeekPriority ?? "");
  }

  async function handleSave() {
    if (!data) return;
    try {
      await saveReview.mutateAsync({
        snapshot: data.snapshot,
        answers: {
          whatWorked: whatWorked.trim() || undefined,
          whatDidntWork: whatDidntWork.trim() || undefined,
          improvement: improvement.trim() || undefined,
          nextWeekPriority: nextWeekPriority.trim() || undefined,
        },
      });
      toast.success("Revisão semanal salva.");
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar a revisão semanal.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) syncFromSaved();
      }}
    >
      <DialogTrigger
        render={<Button variant="outline">Revisão semanal</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisão semanal</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-muted-foreground text-sm">Calculando o resumo…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">XP</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.xpEarned}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Tarefas</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.tasksCompleted}/{data.snapshot.tasksTotal}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Treinos</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.workoutsCompleted}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Dieta</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.mealsAdherent}/{data.snapshot.mealsPlanned}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Devocional</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.devotionalDays}/7
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Vendas</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrencyBRL(data.snapshot.salesRevenueCents)}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Lucro</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrencyBRL(data.snapshot.salesProfitCents)}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Gastos pessoais</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrencyBRL(data.snapshot.personalExpensesCents)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="what-worked" className="text-sm font-medium">
                O que funcionou bem?
              </label>
              <Textarea
                id="what-worked"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="what-didnt-work" className="text-sm font-medium">
                O que não funcionou?
              </label>
              <Textarea
                id="what-didnt-work"
                value={whatDidntWork}
                onChange={(e) => setWhatDidntWork(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="improvement" className="text-sm font-medium">
                O que posso melhorar?
              </label>
              <Textarea
                id="improvement"
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="next-week-priority"
                className="text-sm font-medium"
              >
                Qual minha prioridade na próxima semana?
              </label>
              <Textarea
                id="next-week-priority"
                value={nextWeekPriority}
                onChange={(e) => setNextWeekPriority(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || saveReview.isPending}
          >
            {saveReview.isPending ? "Salvando…" : "Salvar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
