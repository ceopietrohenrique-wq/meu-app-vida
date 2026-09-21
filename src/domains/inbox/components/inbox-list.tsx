"use client";

import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  useArchiveInboxItem,
  useConvertInboxItemToTask,
} from "../mutations/use-inbox-mutations";
import { useInboxItems } from "../queries/use-inbox-items";

export function InboxList() {
  const { data: items, isLoading } = useInboxItems();
  const convertToTask = useConvertInboxItemToTask();
  const archive = useArchiveInboxItem();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        Sua inbox está vazia. Use o botão (+) para capturar algo rapidamente.
      </p>
    );
  }

  async function handleConvert(id: string, content: string) {
    try {
      await convertToTask.mutateAsync({
        itemId: id,
        title: content.slice(0, 200),
      });
      toast.success("Transformado em tarefa.");
    } catch {
      toast.error("Não foi possível transformar em tarefa.");
    }
  }

  async function handleArchive(id: string) {
    try {
      await archive.mutateAsync(id);
    } catch {
      toast.error("Não foi possível arquivar.");
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm whitespace-pre-wrap">{item.content}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConvert(item.id, item.content)}
            >
              Transformar em tarefa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleArchive(item.id)}
            >
              Arquivar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
