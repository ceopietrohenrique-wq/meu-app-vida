"use client";

import { CheckSquare, Inbox as InboxIcon, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCaptureToInbox } from "@/domains/inbox/mutations/use-inbox-mutations";
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

type View = "menu" | "task" | "inbox";

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

  const createTask = useCreateTask();
  const captureToInbox = useCaptureToInbox();
  const { data: profile } = useProfile();

  function reset() {
    setView("menu");
    setTaskTitle("");
    setInboxContent("");
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
