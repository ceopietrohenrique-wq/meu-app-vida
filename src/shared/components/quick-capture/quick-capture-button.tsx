"use client";

import {
  CheckSquare,
  Inbox as InboxIcon,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCaptureToInbox } from "@/domains/inbox/mutations/use-inbox-mutations";
import { useCreateTransaction } from "@/domains/finance/mutations/use-transaction-mutations";
import { useAccounts } from "@/domains/finance/queries/use-accounts";
import {
  createTransactionSchema,
  type CreateTransactionInput,
} from "@/domains/finance/schemas/transaction-schema";
import type { TransactionType } from "@/domains/finance/types/transaction";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { useCreateTask } from "@/domains/tasks/mutations/use-task-mutations";
import { Button } from "@/shared/components/ui/button";
import { todayLocalDateString } from "@/shared/lib/date/local-date";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

type View = "menu" | "task" | "inbox" | "finance";

export function QuickCaptureButton({
  className,
  variant = "fab",
}: {
  className?: string;
  /** "fab" = botão circular (bottom nav mobile). "full" = botão largo com texto (sidebar desktop). */
  variant?: "fab" | "full";
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [taskTitle, setTaskTitle] = useState("");
  const [inboxContent, setInboxContent] = useState("");
  const [financeType, setFinanceType] = useState<TransactionType>("expense");
  const [financeAmount, setFinanceAmount] = useState("");
  const [financeAccountId, setFinanceAccountId] = useState("");
  const [financeDescription, setFinanceDescription] = useState("");
  // Mesma proteção contra double-submit do registro rápido no domínio
  // Financeiro (ver quick-add-transaction-dialog.tsx) — gerado uma vez por
  // intenção de envio, reenviado em todo retry daquele mesmo envio.
  const [financeClientRequestId, setFinanceClientRequestId] = useState(() =>
    crypto.randomUUID(),
  );

  const createTask = useCreateTask();
  const captureToInbox = useCaptureToInbox();
  const createTransaction = useCreateTransaction();
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();

  const financeAccountOptions = accounts.filter(
    (a) => a.context === "pessoal" && a.isActive,
  );
  const resolvedFinanceAccountId =
    financeAccountId || (financeAccountOptions[0]?.id ?? "");

  function reset() {
    setView("menu");
    setTaskTitle("");
    setInboxContent("");
    setFinanceType("expense");
    setFinanceAmount("");
    setFinanceAccountId("");
    setFinanceDescription("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSaveTask() {
    if (!taskTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        title: taskTitle,
        priority: "media",
        xpReward: 10,
        // Tarefa capturada rapidamente é para hoje por padrão — ajustar a
        // data fica em "mais opções", que a Tela Hoje/Tarefas oferece.
        dueDate: profile ? todayLocalDateString(profile.timezone) : undefined,
      });
      toast.success("Tarefa criada.");
      handleOpenChange(false);
    } catch {
      toast.error("Não foi possível criar a tarefa.");
    }
  }

  async function handleSaveInbox() {
    if (!inboxContent.trim()) return;
    try {
      await captureToInbox.mutateAsync(inboxContent);
      toast.success("Adicionado à inbox.");
      handleOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar na inbox.");
    }
  }

  async function handleSaveFinance() {
    if (!financeAmount.trim() || !resolvedFinanceAccountId || !profile) return;
    try {
      // Mesma validação/parsing seguro do domínio Financeiro (Zod +
      // parseMoneyToCents) — nunca uma lógica de dinheiro paralela aqui.
      const parsed: CreateTransactionInput = createTransactionSchema.parse({
        accountId: resolvedFinanceAccountId,
        type: financeType,
        context: "pessoal",
        amount: financeAmount,
        description: financeDescription || undefined,
        transactionDate: todayLocalDateString(profile.timezone),
      });
      await createTransaction.mutateAsync({
        input: parsed,
        clientRequestId: financeClientRequestId,
      });
      toast.success(
        financeType === "expense" ? "Gasto registrado." : "Receita registrada.",
      );
      setFinanceClientRequestId(crypto.randomUUID());
      handleOpenChange(false);
    } catch {
      toast.error("Não foi possível registrar. Confira o valor e a conta.");
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger
        render={
          variant === "fab" ? (
            <button
              type="button"
              aria-label="Capturar rapidamente"
              className={cn(
                "bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
                className,
              )}
            >
              <Plus className="size-6" />
            </button>
          ) : (
            <Button
              aria-label="Capturar rapidamente"
              className={cn("w-full justify-start gap-2", className)}
            >
              <Plus className="size-4" /> Capturar
            </Button>
          )
        }
      />
      <DrawerContent>
        {view === "menu" && (
          <>
            <DrawerHeader>
              <DrawerTitle>O que você quer registrar?</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4 pt-0">
              <Button
                variant="outline"
                className="h-14 justify-start gap-3 text-base"
                onClick={() => setView("task")}
              >
                <CheckSquare className="size-5" /> Nova tarefa
              </Button>
              <Button
                variant="outline"
                className="h-14 justify-start gap-3 text-base"
                onClick={() => setView("inbox")}
              >
                <InboxIcon className="size-5" /> Adicionar à inbox
              </Button>
              <Button
                variant="outline"
                className="h-14 justify-start gap-3 text-base"
                onClick={() => setView("finance")}
              >
                <TrendingDown className="size-5" /> Gasto ou receita
              </Button>
            </div>
          </>
        )}

        {view === "task" && (
          <>
            <DrawerHeader>
              <DrawerTitle>Nova tarefa</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 p-4 pt-0">
              <Input
                autoFocus
                placeholder="O que precisa ser feito?"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTask()}
              />
              <Button onClick={handleSaveTask} disabled={createTask.isPending}>
                {createTask.isPending ? "Salvando…" : "Salvar tarefa"}
              </Button>
            </div>
          </>
        )}

        {view === "inbox" && (
          <>
            <DrawerHeader>
              <DrawerTitle>Adicionar à inbox</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 p-4 pt-0">
              <Textarea
                autoFocus
                placeholder="Anote agora, organize depois…"
                value={inboxContent}
                onChange={(e) => setInboxContent(e.target.value)}
              />
              <Button
                onClick={handleSaveInbox}
                disabled={captureToInbox.isPending}
              >
                {captureToInbox.isPending ? "Salvando…" : "Salvar na inbox"}
              </Button>
            </div>
          </>
        )}

        {view === "finance" && (
          <>
            <DrawerHeader>
              <DrawerTitle>Gasto ou receita</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-3 p-4 pt-0">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={financeType === "expense" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setFinanceType("expense")}
                >
                  <TrendingDown className="size-4" /> Gasto
                </Button>
                <Button
                  type="button"
                  variant={financeType === "income" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setFinanceType("income")}
                >
                  <TrendingUp className="size-4" /> Receita
                </Button>
              </div>
              <Input
                autoFocus
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="Valor (R$)"
                aria-label="Valor (R$)"
                value={financeAmount}
                onChange={(e) => setFinanceAmount(e.target.value)}
              />
              {financeAccountOptions.length > 0 ? (
                <select
                  aria-label="Conta"
                  className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
                  value={resolvedFinanceAccountId}
                  onChange={(e) => setFinanceAccountId(e.target.value)}
                >
                  {financeAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Crie uma conta em Financeiro para registrar aqui.
                </p>
              )}
              <Input
                placeholder="Descrição (opcional)"
                value={financeDescription}
                onChange={(e) => setFinanceDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFinance()}
              />
              <Button
                onClick={handleSaveFinance}
                disabled={
                  createTransaction.isPending || !resolvedFinanceAccountId
                }
              >
                {createTransaction.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </>
        )}

        <DrawerClose
          render={
            <button
              type="button"
              className="text-muted-foreground p-4 pt-0 text-center text-sm"
            >
              Cancelar
            </button>
          }
        />
      </DrawerContent>
    </Drawer>
  );
}
