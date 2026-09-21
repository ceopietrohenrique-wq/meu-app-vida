"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

import { useSpiritualSearch } from "../queries/use-spiritual-search";
import type { SpiritualSearchInput } from "../schemas/search-schema";

const RESULT_TYPE_LABEL: Record<string, string> = {
  bible_study_note: "Nota de estudo",
  saved_verse: "Versículo salvo",
};

export function SpiritualSearchCard() {
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verse, setVerse] = useState("");
  const [word, setWord] = useState("");
  const [tag, setTag] = useState("");

  const filters: SpiritualSearchInput = {
    book: book || undefined,
    chapter: chapter ? Number(chapter) : undefined,
    verse: verse ? Number(verse) : undefined,
    word: word || undefined,
    tag: tag || undefined,
  };

  const hasFilter = Boolean(book || chapter || verse || word || tag);
  const { data: results = [], isLoading } = useSpiritualSearch(filters);

  return (
    <Card id="busca">
      <CardHeader>
        <CardTitle>Buscar</CardTitle>
        <CardDescription>
          Notas de estudo e versículos salvos, por livro, capítulo, versículo,
          palavra ou tag.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Livro"
            aria-label="Buscar por livro"
            value={book}
            onChange={(e) => setBook(e.target.value)}
          />
          <Input
            placeholder="Capítulo"
            aria-label="Buscar por capítulo"
            type="number"
            inputMode="numeric"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
          <Input
            placeholder="Versículo"
            aria-label="Buscar por versículo"
            type="number"
            inputMode="numeric"
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
          />
          <Input
            placeholder="Palavra"
            aria-label="Buscar por palavra"
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
          <Input
            placeholder="Tag"
            aria-label="Buscar por tag"
            className="col-span-2"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>

        {!hasFilter && (
          <p className="text-muted-foreground text-xs">
            Preencha ao menos um campo para buscar.
          </p>
        )}
        {hasFilter && isLoading && (
          <p className="text-muted-foreground text-xs">Buscando…</p>
        )}
        {hasFilter && !isLoading && results.length === 0 && (
          <p className="text-muted-foreground text-xs">Nada encontrado.</p>
        )}

        {results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((result) => (
              <li
                key={`${result.type}:${result.id}`}
                className="rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{result.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {RESULT_TYPE_LABEL[result.type]}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {result.book} {result.chapter}
                  {result.verseStart ? `:${result.verseStart}` : ""}
                  {result.verseEnd ? `-${result.verseEnd}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
