"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";

// Fase 8 > Performance: GlobalSearchTrigger monta em TODA página (está no
// header do app-shell) — cmdk só precisa existir depois do primeiro
// Cmd/Ctrl+K ou clique, nunca no bundle/carregamento inicial de cada rota.
const GlobalSearchCommand = dynamic(
  () =>
    import("./global-search-command").then((mod) => mod.GlobalSearchCommand),
  { ssr: false },
);

/**
 * Atalho Cmd/Ctrl+K abre a busca global de qualquer tela — mesmo padrão de
 * command palette do resto do produto (cmdk já é a base do Command).
 */
export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
        setHasOpenedOnce(true);
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
        onClick={() => {
          setOpen(true);
          setHasOpenedOnce(true);
        }}
        aria-label="Busca global"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar…</span>
        {/* Fase 8 > Acessibilidade: sem opacidade reduzida — /70 sobre
            text-muted-foreground caía para contraste 2.71:1 (abaixo do
            4.5:1 exigido pelo WCAG AA para texto pequeno), achado real por
            varredura automatizada (axe-core) em toda página (o header é
            compartilhado). */}
        <kbd className="text-foreground hidden rounded border px-1 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      {hasOpenedOnce && (
        <GlobalSearchCommand open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
