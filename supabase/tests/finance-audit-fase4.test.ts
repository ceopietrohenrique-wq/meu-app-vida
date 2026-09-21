import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseMoneyToCents } from "@/shared/lib/money";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

type AccountBalanceRow = { id: string; balance: string | number };
type DashboardRow = {
  income: string | number;
  expense: string | number;
  balance: string | number;
};

async function getBalanceCents(
  client: SupabaseClient,
  accountId: string,
): Promise<number> {
  const { data, error } = await client.rpc("get_finance_accounts_with_balance");
  expect(error).toBeNull();
  const row = (data as AccountBalanceRow[]).find((a) => a.id === accountId);
  return parseMoneyToCents(row!.balance);
}

/**
 * Auditoria financeira final da Fase 4 — cobre exatamente os pontos
 * pedidos: semântica de transferência (atômica, idempotente, não conta
 * como receita/despesa), saldos com números conhecidos, filtros por
 * período (mês atual/anterior/intervalo/limites), thresholds
 * configuráveis, precisão monetária sem tolerância de float, e isolamento
 * de contexto pessoal/empresarial. Ver docs/business-rules.md > Fase 4.
 */
describe("Auditoria Financeira — Fase 4", () => {
  let admin: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "finance-audit");
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  describe("1. Transferências entre contas", () => {
    it("R$ 100 de A para B: diminui A, aumenta B, é atômica e idempotente (double-submit)", async () => {
      const { data: accountA } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Origem 1",
          type: "conta_bancaria",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: accountB } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Destino 1",
          type: "conta_bancaria",
          context: "pessoal",
        })
        .select("id")
        .single();

      const clientRequestId = crypto.randomUUID();
      const params = {
        p_account_id: accountA!.id,
        p_type: "transfer",
        p_context: "pessoal",
        p_amount: "100.00",
        p_transaction_date: "2026-06-01",
        p_transfer_account_id: accountB!.id,
        p_client_request_id: clientRequestId,
      };

      // Double-submit: mesma chave de idempotência enviada duas vezes,
      // simulando clique duplo / retry de rede.
      const [first, second] = await Promise.all([
        user.client.rpc("create_finance_transaction", params).single(),
        user.client.rpc("create_finance_transaction", params).single(),
      ]);
      expect(first.error).toBeNull();
      expect(second.error).toBeNull();

      const { data: allTx } = await admin
        .from("finance_transactions")
        .select("id")
        .eq("client_request_id", clientRequestId);
      expect(allTx).toHaveLength(1);

      const balanceA = await getBalanceCents(user.client, accountA!.id);
      const balanceB = await getBalanceCents(user.client, accountB!.id);
      expect(balanceA).toBe(-10000); // -R$ 100,00
      expect(balanceB).toBe(10000); // +R$ 100,00

      // Nunca conta como receita nem despesa, nunca altera o resultado
      // consolidado (income/expense do período).
      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-06-01",
          p_period_end: "2026-06-30",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboard.data!.income)).toBe(0);
      expect(parseMoneyToCents(dashboard.data!.expense)).toBe(0);
    });

    it("transferência exige conta de destino diferente da origem", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({ name: "Conta única", type: "carteira", context: "pessoal" })
        .select("id")
        .single();

      const { error } = await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        transfer_account_id: account!.id,
        type: "transfer",
        context: "pessoal",
        amount: "10.00",
        transaction_date: "2026-06-01",
      });
      expect(error).not.toBeNull();
    });
  });

  describe("2. Saldos das contas — números conhecidos", () => {
    it("saldo inicial + receita - despesa - transferência enviada / recebida, com transação cancelada sem efeito", async () => {
      const { data: accountA } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta saldo A",
          type: "conta_bancaria",
          context: "pessoal",
          initial_balance: "1000.00",
        })
        .select("id")
        .single();
      const { data: accountB } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta saldo B",
          type: "conta_bancaria",
          context: "pessoal",
          initial_balance: "0",
        })
        .select("id")
        .single();

      await user.client.from("finance_transactions").insert({
        account_id: accountA!.id,
        type: "income",
        context: "pessoal",
        amount: "250.50",
        transaction_date: "2026-06-10",
      });
      await user.client.from("finance_transactions").insert({
        account_id: accountA!.id,
        type: "expense",
        context: "pessoal",
        amount: "100.25",
        transaction_date: "2026-06-11",
      });
      await user.client.from("finance_transactions").insert({
        account_id: accountA!.id,
        transfer_account_id: accountB!.id,
        type: "transfer",
        context: "pessoal",
        amount: "200.00",
        transaction_date: "2026-06-12",
      });

      // Transação cancelada NUNCA entra no saldo, mesmo existindo na tabela.
      const { data: canceledTx } = await user.client
        .from("finance_transactions")
        .insert({
          account_id: accountA!.id,
          type: "expense",
          context: "pessoal",
          amount: "999.00",
          transaction_date: "2026-06-13",
        })
        .select("id")
        .single();
      await user.client
        .from("finance_transactions")
        .update({ canceled_at: new Date().toISOString() })
        .eq("id", canceledTx!.id);

      // 1000,00 + 250,50 - 100,25 - 200,00 = 950,25 (exemplo exato do pedido de auditoria)
      const balanceA = await getBalanceCents(user.client, accountA!.id);
      expect(balanceA).toBe(95025);

      // B só recebeu a transferência: 0 + 200,00 = 200,00
      const balanceB = await getBalanceCents(user.client, accountB!.id);
      expect(balanceB).toBe(20000);
    });
  });

  describe("3. Filtros por período", () => {
    let accountId: string;

    beforeAll(async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta período",
          type: "conta_bancaria",
          context: "pessoal",
        })
        .select("id")
        .single();
      accountId = account!.id;

      // Uma despesa em fevereiro, uma em março (limite inicial), uma no
      // meio de março, uma no limite final de março, e uma em abril —
      // cobre "fora do período não entra" nos dois limites.
      const dates = [
        "2026-02-15",
        "2026-03-01",
        "2026-03-15",
        "2026-03-31",
        "2026-04-01",
      ];
      for (const date of dates) {
        await user.client.from("finance_transactions").insert({
          account_id: accountId,
          type: "expense",
          context: "pessoal",
          amount: "10.00",
          transaction_date: date,
        });
      }
    });

    it("mês atual (março): soma só as 3 transações de março, incluindo os limites de início/fim", async () => {
      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-03-01",
          p_period_end: "2026-03-31",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboard.data!.expense)).toBe(3000); // 3 × R$ 10,00
    });

    it("mês anterior (fevereiro): soma só a transação de fevereiro", async () => {
      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-02-01",
          p_period_end: "2026-02-28",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboard.data!.expense)).toBe(1000);
    });

    it("intervalo personalizado (fev a abr): soma todas as 5 transações", async () => {
      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-02-01",
          p_period_end: "2026-04-30",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboard.data!.expense)).toBe(5000);
    });

    it("transação um dia antes/depois do período fica de fora (limites exatos)", async () => {
      const { data: transactions } = await user.client
        .from("finance_transactions")
        .select("transaction_date")
        .eq("account_id", accountId)
        .gte("transaction_date", "2026-03-01")
        .lte("transaction_date", "2026-03-31");
      expect(transactions?.map((t) => t.transaction_date).sort()).toEqual([
        "2026-03-01",
        "2026-03-15",
        "2026-03-31",
      ]);
    });
  });

  describe("5. Thresholds configuráveis por orçamento", () => {
    it("orçamento sem thresholds explícitos usa o default 80/90/100", async () => {
      const { data: cat } = await user.client
        .from("finance_categories")
        .insert({ name: "Categoria threshold default", context: "pessoal" })
        .select("id")
        .single();
      const { data: budget } = await user.client
        .from("finance_budgets")
        .insert({
          category_id: cat!.id,
          context: "pessoal",
          period_month: "2026-07-01",
          planned_amount: "100.00",
        })
        .select("alert_thresholds")
        .single();
      expect(budget!.alert_thresholds).toEqual([80, 90, 100]);
    });

    it("orçamento com thresholds customizados (50/75) só alerta nesses percentuais", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta threshold",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: cat } = await user.client
        .from("finance_categories")
        .insert({ name: "Categoria threshold custom", context: "pessoal" })
        .select("id")
        .single();
      const { data: budget } = await user.client
        .from("finance_budgets")
        .insert({
          category_id: cat!.id,
          context: "pessoal",
          period_month: "2026-07-01",
          planned_amount: "100.00",
          alert_thresholds: [50, 75],
        })
        .select("id")
        .single();

      // 60% — cruza 50, não cruza 75.
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "60.00",
        category_id: cat!.id,
        transaction_date: "2026-07-05",
      });

      const afterFirst = await admin
        .from("finance_budget_alerts")
        .select("threshold_percent")
        .eq("budget_id", budget!.id);
      expect(
        afterFirst.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
      ).toEqual([50]);

      // Permanecer acima de 50 (mais uma pequena despesa, ainda < 75) não
      // gera de novo.
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "5.00",
        category_id: cat!.id,
        transaction_date: "2026-07-06",
      });
      const afterSecond = await admin
        .from("finance_budget_alerts")
        .select("threshold_percent")
        .eq("budget_id", budget!.id);
      expect(
        afterSecond.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
      ).toEqual([50]);

      // Cruza 75% — novo alerta, e 80/90/100 (fora da config deste
      // orçamento) NUNCA são gerados.
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "20.00",
        category_id: cat!.id,
        transaction_date: "2026-07-07",
      });
      const afterThird = await admin
        .from("finance_budget_alerts")
        .select("threshold_percent")
        .eq("budget_id", budget!.id);
      expect(
        afterThird.data?.map((a) => a.threshold_percent).sort((a, b) => a - b),
      ).toEqual([50, 75]);
    });

    it("novo mês permite novos alertas para o mesmo orçamento/categoria", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta threshold mês novo",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: cat } = await user.client
        .from("finance_categories")
        .insert({ name: "Categoria mês novo", context: "pessoal" })
        .select("id")
        .single();

      await user.client.from("finance_budgets").insert({
        category_id: cat!.id,
        context: "pessoal",
        period_month: "2026-08-01",
        planned_amount: "100.00",
      });
      await user.client.from("finance_budgets").insert({
        category_id: cat!.id,
        context: "pessoal",
        period_month: "2026-09-01",
        planned_amount: "100.00",
      });

      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "85.00",
        category_id: cat!.id,
        transaction_date: "2026-08-10",
      });
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "85.00",
        category_id: cat!.id,
        transaction_date: "2026-09-10",
      });

      const { data: alerts } = await admin
        .from("finance_budget_alerts")
        .select("period_month, threshold_percent")
        .eq("user_id", user.id)
        .in("period_month", ["2026-08-01", "2026-09-01"]);
      expect(alerts).toHaveLength(2);
      expect(alerts?.every((a) => a.threshold_percent === 80)).toBe(true);
    });
  });

  describe("6. Precisão monetária integrada (valores problemáticos para float)", () => {
    it("0,10 + 0,20 somados pelo banco resultam em exatamente R$ 0,30 (clássico erro de float)", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta centavos",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();

      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "0.10",
        transaction_date: "2026-10-01",
      });
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "0.20",
        transaction_date: "2026-10-01",
      });

      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-10-01",
          p_period_end: "2026-10-31",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboard.data!.expense)).toBe(30);
      expect(await getBalanceCents(user.client, account!.id)).toBe(-30);

      // Uma terceira transação de centavos — várias transações com centavos
      // continuam somando exato, nunca 0.4000000000000001 nem afins.
      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "0.10",
        transaction_date: "2026-10-02",
      });
      const dashboardAfterThird = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-10-01",
          p_period_end: "2026-10-31",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(dashboardAfterThird.data!.expense)).toBe(40);
      expect(await getBalanceCents(user.client, account!.id)).toBe(-40);
    });

    it("orçamento com centavos (R$ 99,99) calcula percentual e saldo restante exatos", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta orçamento centavos",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: cat } = await user.client
        .from("finance_categories")
        .insert({ name: "Categoria centavos", context: "pessoal" })
        .select("id")
        .single();
      await user.client.from("finance_budgets").insert({
        category_id: cat!.id,
        context: "pessoal",
        period_month: "2026-10-01",
        planned_amount: "99.99",
      });

      await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "pessoal",
        amount: "33.33",
        category_id: cat!.id,
        transaction_date: "2026-10-05",
      });

      const dashboard = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-10-01",
          p_period_end: "2026-10-31",
        })
        .single<{
          top_categories: { category_id: string; total: string | number }[];
        }>();

      const categoryTotal = dashboard.data!.top_categories.find(
        (c) => c.category_id === cat!.id,
      )!;
      expect(parseMoneyToCents(categoryTotal.total)).toBe(3333);
    });
  });

  describe("7. Categorias e contextos", () => {
    it("categoria pessoal não pode ser usada em transação empresarial (e vice-versa)", async () => {
      const { data: account } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta contexto A",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: personalCategory } = await user.client
        .from("finance_categories")
        .insert({ name: "Categoria pessoal contexto", context: "pessoal" })
        .select("id")
        .single();

      const { error } = await user.client.from("finance_transactions").insert({
        account_id: account!.id,
        type: "expense",
        context: "empresarial",
        amount: "10.00",
        category_id: personalCategory!.id,
        transaction_date: "2026-06-01",
      });
      expect(error).not.toBeNull();
    });

    it("conta pessoal não pode ser usada em transação empresarial (contextos não se misturam)", async () => {
      const { data: personalAccount } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta pessoal pura",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();

      const { error } = await user.client.from("finance_transactions").insert({
        account_id: personalAccount!.id,
        type: "expense",
        context: "empresarial",
        amount: "10.00",
        transaction_date: "2026-06-01",
      });
      expect(error).not.toBeNull();
    });

    it("visão pessoal não inclui empresarial, visão empresarial não inclui pessoal, consolidado soma ambos", async () => {
      const { data: personalAccount } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta view pessoal",
          type: "carteira",
          context: "pessoal",
        })
        .select("id")
        .single();
      const { data: businessAccount } = await user.client
        .from("finance_accounts")
        .insert({
          name: "Conta view empresarial",
          type: "caixa_empresa",
          context: "empresarial",
        })
        .select("id")
        .single();

      await user.client.from("finance_transactions").insert({
        account_id: personalAccount!.id,
        type: "expense",
        context: "pessoal",
        amount: "40.00",
        transaction_date: "2026-11-01",
      });
      await user.client.from("finance_transactions").insert({
        account_id: businessAccount!.id,
        type: "expense",
        context: "empresarial",
        amount: "60.00",
        transaction_date: "2026-11-01",
      });

      const personalView = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "pessoal",
          p_period_start: "2026-11-01",
          p_period_end: "2026-11-30",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(personalView.data!.expense)).toBe(4000);

      const businessView = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "empresarial",
          p_period_start: "2026-11-01",
          p_period_end: "2026-11-30",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(businessView.data!.expense)).toBe(6000);

      const consolidatedView = await user.client
        .rpc("get_finance_dashboard_summary", {
          p_context: "consolidado",
          p_period_start: "2026-11-01",
          p_period_end: "2026-11-30",
        })
        .single<DashboardRow>();
      expect(parseMoneyToCents(consolidatedView.data!.expense)).toBe(10000);
    });
  });
});
