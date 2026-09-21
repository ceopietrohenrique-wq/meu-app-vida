import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, as regras críticas da Fase 4: geração
 * idempotente de recorrência, dedup de alertas de orçamento, transferências
 * nunca duplicando receita/despesa, e saldo/dashboard sempre excluindo
 * transações canceladas. Ver docs/business-rules.md > Fase 4.
 */
describe("Financeiro — idempotência e regras de soma", () => {
  let admin: SupabaseClient;
  let user: TestUser;
  let accountId: string;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "finance-fase4");

    const { data: account } = await user.client
      .from("finance_accounts")
      .insert({
        name: "Conta principal",
        type: "conta_bancaria",
        context: "pessoal",
        initial_balance: "1000.00",
      })
      .select("id")
      .single();
    accountId = account!.id;
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("geração de recorrência é idempotente: chamar duas vezes para o mesmo período não duplica ocorrências", async () => {
    const { data: recurrence } = await user.client
      .from("finance_recurrences")
      .insert({
        name: "Netflix",
        type: "expense",
        context: "pessoal",
        account_id: accountId,
        amount: "39.90",
        day_of_month: 15,
        starts_on: "2026-01-01",
      })
      .select("id")
      .single();

    const first = await user.client.rpc(
      "generate_finance_recurrence_occurrences",
      {
        p_recurrence_id: recurrence!.id,
        p_until: "2026-04-15",
      },
    );
    expect(first.error).toBeNull();
    expect((first.data as unknown[]).length).toBe(4); // jan, fev, mar, abr (dia 15)

    // Chamar de novo para o MESMO período não gera nenhuma ocorrência nova.
    const second = await user.client.rpc(
      "generate_finance_recurrence_occurrences",
      {
        p_recurrence_id: recurrence!.id,
        p_until: "2026-04-15",
      },
    );
    expect(second.error).toBeNull();
    expect((second.data as unknown[]).length).toBe(0);

    const { data: transactions } = await admin
      .from("finance_transactions")
      .select("id, transaction_date")
      .eq("recurrence_id", recurrence!.id);
    expect(transactions).toHaveLength(4);
  });

  it("recorrência com parcelas (total_installments) para de gerar após o limite", async () => {
    const { data: recurrence } = await user.client
      .from("finance_recurrences")
      .insert({
        name: "Parcelamento 3x",
        type: "expense",
        context: "pessoal",
        account_id: accountId,
        amount: "100.00",
        day_of_month: 10,
        starts_on: "2026-01-01",
        total_installments: 3,
      })
      .select("id")
      .single();

    const result = await user.client.rpc(
      "generate_finance_recurrence_occurrences",
      {
        p_recurrence_id: recurrence!.id,
        p_until: "2026-12-01",
      },
    );
    expect(result.error).toBeNull();
    expect((result.data as unknown[]).length).toBe(3);
  });

  it("alertas de orçamento: cruzar 80% e depois 100% notifica cada threshold uma única vez", async () => {
    const { data: category } = await user.client
      .from("finance_categories")
      .insert({ name: "Alimentação alerta", context: "pessoal" })
      .select("id")
      .single();

    await user.client.from("finance_budgets").insert({
      category_id: category!.id,
      context: "pessoal",
      period_month: "2026-05-01",
      planned_amount: "100.00",
    });

    // 82% — cruza o threshold de 80%.
    await user.client.from("finance_transactions").insert({
      account_id: accountId,
      type: "expense",
      context: "pessoal",
      amount: "82.00",
      category_id: category!.id,
      transaction_date: "2026-05-05",
    });

    const afterFirst = await admin
      .from("finance_budget_alerts")
      .select("threshold_percent")
      .eq("period_month", "2026-05-01")
      .eq("user_id", user.id);
    expect(
      afterFirst.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
    ).toEqual([80]);

    // Mais uma transação pequena — ainda abaixo de 90%, então NENHUM alerta novo.
    await user.client.from("finance_transactions").insert({
      account_id: accountId,
      type: "expense",
      context: "pessoal",
      amount: "2.00",
      category_id: category!.id,
      transaction_date: "2026-05-06",
    });

    const afterSecond = await admin
      .from("finance_budget_alerts")
      .select("threshold_percent")
      .eq("period_month", "2026-05-01")
      .eq("user_id", user.id);
    expect(
      afterSecond.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
    ).toEqual([80]);

    // Estoura para 130% de uma vez — cruza 90% E 100% na mesma transação,
    // cada um notificado exatamente uma vez.
    await user.client.from("finance_transactions").insert({
      account_id: accountId,
      type: "expense",
      context: "pessoal",
      amount: "46.00",
      category_id: category!.id,
      transaction_date: "2026-05-07",
    });

    const afterThird = await admin
      .from("finance_budget_alerts")
      .select("threshold_percent")
      .eq("period_month", "2026-05-01")
      .eq("user_id", user.id);
    expect(
      afterThird.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
    ).toEqual([80, 90, 100]);

    const { data: notifications } = await admin
      .from("notifications")
      .select("notification_key")
      .eq("user_id", user.id)
      .eq("type", "BUDGET_ALERT");
    expect(notifications).toHaveLength(3);
  });

  it("transferência nunca duplica receita/despesa e afeta o saldo das duas contas", async () => {
    const { data: destinationAccount } = await user.client
      .from("finance_accounts")
      .insert({ name: "Poupança", type: "conta_bancaria", context: "pessoal" })
      .select("id")
      .single();

    const before = await user.client.rpc("get_finance_accounts_with_balance");
    const originBefore = (
      before.data as { id: string; balance: string }[]
    ).find((a) => a.id === accountId)!;

    await user.client.from("finance_transactions").insert({
      account_id: accountId,
      transfer_account_id: destinationAccount!.id,
      type: "transfer",
      context: "pessoal",
      amount: "200.00",
      transaction_date: "2026-05-10",
    });

    const after = await user.client.rpc("get_finance_accounts_with_balance");
    const rows = after.data as { id: string; balance: string }[];
    const originAfter = rows.find((a) => a.id === accountId)!;
    const destinationAfter = rows.find((a) => a.id === destinationAccount!.id)!;

    expect(Number(originAfter.balance)).toBeCloseTo(
      Number(originBefore.balance) - 200,
      2,
    );
    expect(Number(destinationAfter.balance)).toBeCloseTo(200, 2);

    // Transferência nunca entra em income/expense do dashboard.
    const dashboard = await user.client
      .rpc("get_finance_dashboard_summary", {
        p_context: "pessoal",
        p_period_start: "2026-05-01",
        p_period_end: "2026-05-31",
      })
      .single<{ income: string; expense: string }>();
    // Só as transações de orçamento (82+2+46=130 de despesa) contam — a
    // transferência de 200 não aparece nem em income nem em expense.
    expect(Number(dashboard.data?.expense)).toBeCloseTo(130, 2);
  });

  it("cancelar uma transação exclui do saldo da conta (soft cancel, nunca deleção física)", async () => {
    const { data: tx } = await user.client
      .from("finance_transactions")
      .insert({
        account_id: accountId,
        type: "expense",
        context: "pessoal",
        amount: "50.00",
        transaction_date: "2026-05-15",
      })
      .select("id")
      .single();

    const before = await user.client.rpc("get_finance_accounts_with_balance");
    const balanceBefore = Number(
      (before.data as { id: string; balance: string }[]).find(
        (a) => a.id === accountId,
      )!.balance,
    );

    await user.client
      .from("finance_transactions")
      .update({ canceled_at: new Date().toISOString() })
      .eq("id", tx!.id);

    const after = await user.client.rpc("get_finance_accounts_with_balance");
    const balanceAfter = Number(
      (after.data as { id: string; balance: string }[]).find(
        (a) => a.id === accountId,
      )!.balance,
    );

    expect(balanceAfter).toBeCloseTo(balanceBefore + 50, 2);

    // A linha continua existindo — histórico preservado, nunca DELETE físico.
    const { data: stillThere } = await admin
      .from("finance_transactions")
      .select("id, canceled_at")
      .eq("id", tx!.id)
      .single();
    expect(stillThere?.canceled_at).not.toBeNull();
  });
});
