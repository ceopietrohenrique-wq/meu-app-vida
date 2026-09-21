"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useDeleteSavedVerse } from "../mutations/use-saved-verse-mutations";
import { useSavedVerses } from "../queries/use-saved-verses";
import { CreateSavedVerseDialog } from "./create-saved-verse-dialog";

export function SavedVersesCard() {
  const { data: verses = [], isLoading } = useSavedVerses();
  const deleteVerse = useDeleteSavedVerse();

  async function handleDelete(id: string) {
    try {
      await deleteVerse.mutateAsync(id);
    } catch {
      toast.error("Não foi possível excluir o versículo.");
    }
  }

  return (
    <Card id="versiculos">
      <CardHeader>
        <CardTitle>Versículos salvos</CardTitle>
        <CardDescription>
          {verses.length > 0
            ? `${verses.length} salvos`
            : "Nenhum versículo salvo ainda"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {verses.map((verse) => (
              <li key={verse.id} className="rounded-md border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{verse.reference}</span>
                  <button
                    type="button"
                    aria-label="Excluir versículo"
                    onClick={() => handleDelete(verse.id)}
                    className="text-muted-foreground shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {verse.notes && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {verse.notes}
                  </p>
                )}
                {verse.tags && verse.tags.length > 0 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {verse.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <CreateSavedVerseDialog />
      </CardContent>
    </Card>
  );
}
