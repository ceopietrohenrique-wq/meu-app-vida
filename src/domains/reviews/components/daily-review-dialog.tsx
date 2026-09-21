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

import { useSaveDailyReview } from "../mutations/use-daily-review-mutations";
import { useDailyReviewData } from "../queries/use-daily-review";

export function DailyReviewDialog({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useDailyReviewData(date);
  const saveDailyReview = useSaveDailyReview(date);
  const [note, setNote] = useState("");

  async function handleSave() {
    if (!data) return;
    try {
      await saveDailyReview.mutateAsync({
        snapshot: data.snapshot,
        carryOverNote: note.trim() || null,
      });
      toast.success("Revisão do dia salva.");
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar a revisão do dia.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setNote(data?.savedReview?.carryOverNote ?? "");
      }}
    >
      <DialogTrigger
        render={<Button variant="outline">Encerrar o dia</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerramento do dia</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-muted-foreground text-sm">Calculando o resumo…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">Tarefas</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.tasksCompleted}/{data.snapshot.tasksTotal}
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="text-muted-foreground">XP ganho hoje</dt>
                <dd className="text-lg font-semibold">
                  {data.snapshot.xpEarned}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="carry-over" className="text-sm font-medium">
                Algo para levar para amanhã? (opcional)
              </label>
              <Textarea
                id="carry-over"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: terminar a proposta do cliente X"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || saveDailyReview.isPending}
          >
            {saveDailyReview.isPending ? "Salvando…" : "Salvar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
