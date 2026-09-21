import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que os dados financeiros (contas,
 * categorias, transações, recorrências, orçamentos, alertas) de um usuário
 * nunca são visíveis ou editáveis por outro usuário. Ver
 * docs/business-rules.md > Fase 4.
 */
describe("RLS — Fase 4 (Financeiro)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase4-a");
    userB = await createTestUser(admin, "fase4-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("finance_accounts: isolado por usuário, incluindo update/delete", async () => {
    const { data: account, error } = await userA.client
      .from("finance_accounts")
      .insert({ name: "Carteira A", type: "carteira", context: "pessoal" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("finance_accounts")
      .select("id")
      .eq("id", account!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("finance_accounts")
      .update({ name: "hackeado" })
      .eq("id", account!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    const { data: deletedByB } = await userB.client
      .from("finance_accounts")
      .delete()
      .eq("id", account!.id)
      .select("id");
    expect(deletedByB).toEqual([]);
  });

  it("finance_categories: isolado por usuário (mesmo nome permitido para usuários diferentes)", async () => {
    const { data: categoryA, error } = await userA.client
      .from("finance_categories")
      .insert({ name: "Alimentação", context: "pessoal" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { error: errorB } = await userB.client
      .from("finance_categories")
      .insert({ name: "Alimentação", context: "pessoal" });
    expect(errorB).toBeNull();

    const { data: seenByB } = await userB.client
      .from("finance_categories")
      .select("id")
      .eq("id", categoryA!.id);
    expect(seenByB).toEqual([]);
  });

  it("finance_transactions: isolado por usuário, e não é possível referenciar conta/categoria de outro usuário", async () => {
    const { data: accountA } = await userA.client
      .from("finance_accounts")
      .insert({ name: "Conta A", type: "conta_bancaria", context: "pessoal" })
      .select("id")
      .single();
    const { data: accountB } = await userB.client
      .from("finance_accounts")
      .insert({ name: "Conta B", type: "conta_bancaria", context: "pessoal" })
      .select("id")
      .single();

    const { data: tx, error } = await userA.client
      .from("finance_transactions")
      .insert({
        account_id: accountA!.id,
        type: "expense",
        context: "pessoal",
        amount: "20.00",
        transaction_date: "2026-03-01",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("finance_transactions")
      .select("id")
      .eq("id", tx!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("finance_transactions")
      .update({ canceled_at: new Date().toISOString() })
      .eq("id", tx!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    // Usuário A tenta lançar uma transação usando a conta do usuário B —
    // bloqueado pelo trigger finance_transactions_validate_ownership, não só
    // pela RLS (a conta de B existe de verdade, só não pertence a A).
    const { error: crossAccountError } = await userA.client
      .from("finance_transactions")
      .insert({
        account_id: accountB!.id,
        type: "expense",
        context: "pessoal",
        amount: "10.00",
        transaction_date: "2026-03-01",
      });
    expect(crossAccountError).not.toBeNull();
  });

  it("finance_recurrences: usuário B não acessa nem gera ocorrências da recorrência de A", async () => {
    const { data: accountA } = await userA.client
      .from("finance_accounts")
      .insert({
        name: "Conta recorrência A",
        type: "conta_bancaria",
        context: "pessoal",
      })
      .select("id")
      .single();

    const { data: recurrence } = await userA.client
      .from("finance_recurrences")
      .insert({
        name: "Netflix",
        type: "expense",
        context: "pessoal",
        account_id: accountA!.id,
        amount: "39.90",
        day_of_month: 15,
        starts_on: "2026-01-01",
      })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("finance_recurrences")
      .select("id")
      .eq("id", recurrence!.id);
    expect(seenByB).toEqual([]);

    const { error: rpcErrorForB } = await userB.client.rpc(
      "generate_finance_recurrence_occurrences",
      { p_recurrence_id: recurrence!.id, p_until: "2026-06-01" },
    );
    expect(rpcErrorForB).not.toBeNull();
  });

  it("finance_budgets e finance_budget_alerts: isolados por usuário", async () => {
    const { data: category } = await userA.client
      .from("finance_categories")
      .insert({ name: "Categoria orçamento A", context: "pessoal" })
      .select("id")
      .single();

    const { data: budget } = await userA.client
      .from("finance_budgets")
      .insert({
        category_id: category!.id,
        context: "pessoal",
        period_month: "2026-04-01",
        planned_amount: "100.00",
      })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("finance_budgets")
      .select("id")
      .eq("id", budget!.id);
    expect(seenByB).toEqual([]);

    const { data: alertsSeenByB } = await userB.client
      .from("finance_budget_alerts")
      .select("id")
      .eq("budget_id", budget!.id);
    expect(alertsSeenByB).toEqual([]);
  });
});
