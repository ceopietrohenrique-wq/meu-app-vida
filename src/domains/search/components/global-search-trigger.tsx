"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";

import { GlobalSearchCommand } from "./global-search-command";

/**
 * Atalho Cmd/Ctrl+K abre a busca global de qualquer tela — mesmo padrão de
 * command palette do resto do produto (cmdk já é a base do Command).
 */
export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground gap-2"
        onClick={() => setOpen(true)}
        aria-label="Busca global"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="text-muted-foreground/70 hidden rounded border px-1 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <GlobalSearchCommand open={open} onOpenChange={setOpen} />
    </>
  );
}
