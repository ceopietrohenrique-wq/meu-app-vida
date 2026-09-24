/**
 * Busca TODAS as linhas de uma query paginando em lotes controlados — nunca
 * um único `select("*")` sem `.range()` para exportação/backup. Necessário
 * porque o PostgREST (API do Supabase) pode limitar a quantidade de linhas
 * por request; sem paginação explícita, um usuário com mais linhas que
 * esse limite teria dados faltando SILENCIOSAMENTE no export/backup — o
 * tipo de bug que só aparece depois que o usuário já confiou no arquivo
 * (CLAUDE.md > Fase de auditoria: "não carregar milhares de linhas de
 * forma ingênua").
 */
export async function fetchAllRows<T>(
  queryPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    results.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return results;
}
