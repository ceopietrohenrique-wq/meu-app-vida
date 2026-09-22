"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";

import { useGlobalSearch } from "../queries/use-global-search";
import type { GlobalSearchResult } from "../types/search-result";

const GROUP_LABEL: Record<GlobalSearchResult["type"], string> = {
  task: "Tarefas",
  customer: "Clientes",
  bible_study_note: "Estudo bíblico",
  catalog_item: "Catálogo",
};

export function GlobalSearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const deferredTerm = useDeferredValue(term);
  const { data: results = [], isLoading } = useGlobalSearch(deferredTerm);

  function handleSelect(result: GlobalSearchResult) {
    onOpenChange(false);
    setTerm("");
    router.push(result.href);
  }

  const groups = Object.entries(GROUP_LABEL) as [
    GlobalSearchResult["type"],
    string,
  ][];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Busca global">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Buscar tarefas, clientes, notas, catálogo…"
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          {term.trim().length < 2 ? (
            <CommandEmpty>Digite ao menos 2 letras para buscar.</CommandEmpty>
          ) : isLoading ? (
            <CommandEmpty>Buscando…</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>Nada encontrado.</CommandEmpty>
          ) : (
            groups.map(([type, label]) => {
              const items = results.filter((r) => r.type === type);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={type} heading={label}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.type}:${item.id}`}
                      value={`${item.type}:${item.id}`}
                      onSelect={() => handleSelect(item)}
                    >
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="text-muted-foreground text-xs">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
