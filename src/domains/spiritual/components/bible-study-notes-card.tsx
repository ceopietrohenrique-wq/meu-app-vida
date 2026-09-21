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

import { useDeleteBibleStudyNote } from "../mutations/use-bible-study-mutations";
import { useBibleStudyNotes } from "../queries/use-bible-study-notes";
import { CreateBibleStudyNoteDialog } from "./create-bible-study-note-dialog";

export function BibleStudyNotesCard() {
  const { data: notes = [], isLoading } = useBibleStudyNotes();
  const deleteNote = useDeleteBibleStudyNote();

  async function handleDelete(id: string) {
    try {
      await deleteNote.mutateAsync(id);
    } catch {
      toast.error("Não foi possível excluir a nota.");
    }
  }

  return (
    <Card id="estudo">
      <CardHeader>
        <CardTitle>Estudo Bíblico</CardTitle>
        <CardDescription>
          {notes.length > 0 ? `${notes.length} notas` : "Nenhuma nota ainda"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {note.book} {note.chapter}
                      {note.verseStart ? `:${note.verseStart}` : ""}
                      {note.verseEnd ? `-${note.verseEnd}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Excluir nota"
                    onClick={() => handleDelete(note.id)}
                    className="text-muted-foreground shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {note.tags && note.tags.length > 0 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {note.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <CreateBibleStudyNoteDialog />
      </CardContent>
    </Card>
  );
}
