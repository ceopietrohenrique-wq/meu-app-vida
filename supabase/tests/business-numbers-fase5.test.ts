import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseMoneyToCents } from "@/shared/lib/money";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

type SaleRow = {
  id: string;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  direct_costs: string;
  fees: string;
  status: string;
};

type DashboardRow = {
  gross_revenue: string;
  net_revenue: string;
  direct_costs: string;
  gross_profit: string;
  operating_expenses: string;
  fees: string;
  net_profit: string;
  margin_percent: string | null;
  roi_percent: string | null;
  sales_count: string | number;
  average_ticket: string | null;
};

/**
 * Casos de teste com números exatos (CLAUDE.md > Fase 5 > 12) — nunca
 * `toBeCloseTo` para dinheiro. Prova as definições de
 * docs/business-rules.md > Fase 5 > Definições dos indicadores contra o
 * banco real.
 */
describe("Negócios — números exatos (Fase 5)", () => {
  let admin: SupabaseClient;
  let user: TestUser;
  let accountId: string;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "business-numbers");

    const { data: account } = await user.client
      .from("finance_accounts")
      .insert({ name: "Caixa", type: "caixa_empresa", context: "empresarial" })
      .select("id")
      .single();
    accountId = account!.id;
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("caso obrigatório do CLAUDE.md: bruto 1000, desconto 100, líquida 900, custo 200, taxas 50", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Serviço 1000",
        type: "servico",
        default_price: "1000.00",
        default_cost: "200.00",
      })
      .select("id")
      .single();

    const { data: sale, error } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [
          {
            catalog_item_id: catalogItem!.id,
            quantity: 1,
            discount_amount: 100,
          },
        ],
        p_account_id: accountId,
        p_status: "confirmed",
        p_fees: 50,
        p_sale_date: "2026-12-05",
      })
      .single<SaleRow>();

    expect(error).toBeNull();
    expect(Number(sale!.gross_amount)).toBe(1000);
    expect(Number(sale!.discount_amount)).toBe(100);
    expect(Number(sale!.net_amount)).toBe(900);
    expect(Number(sale!.direct_costs)).toBe(200);
    expect(Number(sale!.fees)).toBe(50);

    const dashboard = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2026-12-01",
        p_period_end: "2026-12-31",
      })
      .single<DashboardRow>();

    expect(error).toBeNull();
    // lucro bruto = 900 - 200 = 700,00; líquido gerencial = 700 - 0 opex - 50 taxas = 650,00.
    expect(parseMoneyToCents(dashboard.data!.gross_profit)).toBe(70000);
    expect(parseMoneyToCents(dashboard.data!.net_profit)).toBe(65000);
    // margem = 700/900 × 100 ≈ 77.78%; roi = 700/200 × 100 = 350%.
    expect(Number(dashboard.data!.margin_percent)).toBeCloseTo(77.777, 2);
    expect(Number(dashboard.data!.roi_percent)).toBe(350);
  });

  it("várias vendas somam corretamente e ticket médio é exato", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item ticket médio",
        type: "servico",
        default_price: "300.00",
      })
      .select("id")
      .single();

    for (let i = 0; i < 3; i++) {
      await user.client.rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-10",
      });
    }

    const dashboard = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2026-12-10",
        p_period_end: "2026-12-10",
      })
      .single<DashboardRow>();

    expect(Number(dashboard.data!.sales_count)).toBe(3);
    expect(parseMoneyToCents(dashboard.data!.net_revenue)).toBe(90000); // 3 × 300,00
    expect(parseMoneyToCents(dashboard.data!.average_ticket!)).toBe(30000); // 900/3
  });

  it("venda cancelada nunca conta como faturamento", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item cancelado",
        type: "servico",
        default_price: "500.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-11",
      })
      .single<SaleRow>();

    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "cancelled",
      p_client_request_id: crypto.randomUUID(),
    });

    const dashboard = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2026-12-11",
        p_period_end: "2026-12-11",
      })
      .single<DashboardRow>();

    expect(Number(dashboard.data!.sales_count)).toBe(0);
    expect(parseMoneyToCents(dashboard.data!.gross_revenue)).toBe(0);
  });

  it("venda reembolsada nunca conta como faturamento (mesmo já tendo sido paga)", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item reembolso",
        type: "servico",
        default_price: "400.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_account_id: accountId,
        p_status: "confirmed",
        p_sale_date: "2026-12-12",
      })
      .single<SaleRow>();

    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "paid",
      p_client_request_id: crypto.randomUUID(),
    });
    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "refunded",
      p_client_request_id: crypto.randomUUID(),
    });

    const dashboard = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2026-12-12",
        p_period_end: "2026-12-12",
      })
      .single<DashboardRow>();

    expect(Number(dashboard.data!.sales_count)).toBe(0);
    expect(parseMoneyToCents(dashboard.data!.gross_revenue)).toBe(0);
  });

  it("denominador zero: sem vendas no período, margem/roi/ticket médio são null, nunca NaN/Infinity", async () => {
    const dashboard = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2020-01-01",
        p_period_end: "2020-01-31",
      })
      .single<DashboardRow>();

    expect(dashboard.data!.margin_percent).toBeNull();
    expect(dashboard.data!.roi_percent).toBeNull();
    expect(dashboard.data!.average_ticket).toBeNull();
    expect(Number(dashboard.data!.sales_count)).toBe(0);
  });

  it("centavos: preço com centavos soma exato, sem erro de ponto flutuante", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item centavos",
        type: "servico",
        default_price: "19.90",
        default_cost: "5.15",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 3 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-13",
      })
      .single<SaleRow>();

    // 3 × 19,90 = 59,70 exato (não 59.699999999999996).
    expect(parseMoneyToCents(sale!.gross_amount)).toBe(5970);
    expect(parseMoneyToCents(sale!.direct_costs)).toBe(1545); // 3 × 5,15
  });

  it("kit com múltiplos itens: create_sale soma corretamente cada item", async () => {
    const { data: productItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto do kit",
        type: "produto",
        default_price: "80.00",
        default_cost: "30.00",
      })
      .select("id")
      .single();
    const { data: serviceItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Serviço do kit",
        type: "servico",
        default_price: "150.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [
          { catalog_item_id: productItem!.id, quantity: 2 },
          {
            catalog_item_id: serviceItem!.id,
            quantity: 1,
            discount_amount: 20,
          },
        ],
        p_sale_date: "2026-12-14",
      })
      .single<SaleRow>();

    // 2×80 + 1×150 = 310 bruto; desconto 20; líquido 290; custo 2×30=60.
    expect(Number(sale!.gross_amount)).toBe(310);
    expect(Number(sale!.discount_amount)).toBe(20);
    expect(Number(sale!.net_amount)).toBe(290);
    expect(Number(sale!.direct_costs)).toBe(60);

    const { data: items } = await admin
      .from("sale_items")
      .select("item_name, unit_price, total")
      .eq("sale_id", sale!.id)
      .order("item_name");
    expect(items).toHaveLength(2);
  });

  it("alterar o preço do catálogo depois não afeta o snapshot de uma venda antiga", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item snapshot",
        type: "servico",
        default_price: "100.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_sale_date: "2026-12-15",
      })
      .single<SaleRow>();

    await user.client
      .from("catalog_items")
      .update({ default_price: "999.00" })
      .eq("id", catalogItem!.id);

    const { data: item } = await admin
      .from("sale_items")
      .select("unit_price, total")
      .eq("sale_id", sale!.id)
      .single();

    expect(Number(item!.unit_price)).toBe(100);
    expect(Number(item!.total)).toBe(100);
  });
});
