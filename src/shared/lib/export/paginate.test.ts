import { describe, expect, it, vi } from "vitest";

import { fetchAllRows } from "./paginate";

describe("fetchAllRows", () => {
  it("junta múltiplas páginas até a última página incompleta", async () => {
    const pages = [
      Array.from({ length: 3 }, (_, i) => ({ id: i })),
      Array.from({ length: 3 }, (_, i) => ({ id: i + 3 })),
      [{ id: 6 }],
    ];
    const queryPage = vi.fn(async () => ({
      data: pages.shift() ?? [],
      error: null,
    }));

    const result = await fetchAllRows(queryPage, 3);
    expect(result).toHaveLength(7);
    expect(result.map((r) => r.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(queryPage).toHaveBeenCalledTimes(3);
  });

  it("para na primeira página quando ela já vem menor que o tamanho do lote", async () => {
    const queryPage = vi.fn(async () => ({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    }));
    const result = await fetchAllRows(queryPage, 1000);
    expect(result).toHaveLength(2);
    expect(queryPage).toHaveBeenCalledTimes(1);
  });

  it("dataset vazio retorna array vazio sem erro", async () => {
    const queryPage = vi.fn(async () => ({ data: [], error: null }));
    const result = await fetchAllRows(queryPage);
    expect(result).toEqual([]);
  });

  it("propaga erro da query em vez de silenciar", async () => {
    const queryPage = vi.fn(async () => ({
      data: null,
      error: { message: "falha simulada" },
    }));
    await expect(fetchAllRows(queryPage)).rejects.toThrow("falha simulada");
  });

  it("usa from/to corretos a cada página (range explícito, nunca select sem limite)", async () => {
    const calls: [number, number][] = [];
    const pages = [Array.from({ length: 2 }, (_, i) => ({ id: i })), []];
    const queryPage = vi.fn(async (from: number, to: number) => {
      calls.push([from, to]);
      return { data: pages.shift() ?? [], error: null };
    });
    await fetchAllRows(queryPage, 2);
    expect(calls[0]).toEqual([0, 1]);
  });
});
