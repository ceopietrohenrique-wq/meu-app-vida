import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Smoke test das RPCs de venda (create_sale/update_sale_status) contra o
 * banco real, antes de construir a camada de aplicação por cima. Cobertura
 * completa de regra de negócio fica em finance-audit-fase4-style
 * `business-*-fase5.test.ts`.
 */
describe("Fase 5 — smoke RPCs de venda", () => {
  let admin: SupabaseClient;
  let user: TestUser;
  let accountId: string;
  let productId: string;
  let serviceId: string;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "sales-smoke");

    const { data: account } = await user.client
      .from("finance_accounts")
      .insert({ name: "Caixa", type: "caixa_empresa", context: "empresarial" })
      .select("id")
      .single();
    accountId = account!.id;

    const { data: product } = await user.client
      .from("catalog_items")
      .insert({
        name: "Plaquinha Google",
        type: "produto",
        default_price: "50.00",
        default_cost: "20.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();
    productId = product!.id;

    await user.client.from("inventory_movements").insert({
      catalog_item_id: productId,
      type: "entrada",
      quantity_delta: 10,
      notes: "Estoque inicial",
    });

    const { data: service } = await user.client
      .from("catalog_items")
      .insert({
        name: "Configuração de site",
        type: "servico",
        default_price: "300.00",
        default_cost: "0",
      })
      .select("id")
      .single();
    serviceId = service!.id;
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("create_sale cria venda + sale_items com totais calculados no banco", async () => {
    const { data: sale, error } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [
          { catalog_item_id: productId, quantity: 2 },
          { catalog_item_id: serviceId, quantity: 1, discount_amount: 50 },
        ],
        p_account_id: accountId,
        p_status: "confirmed",
        p_sale_date: "2026-11-01",
      })
      .single<{
        id: string;
        gross_amount: string;
        discount_amount: string;
        net_amount: string;
        direct_costs: string;
      }>();

    expect(error).toBeNull();
    // 2×50 + 1×300 = 400 bruto; desconto 50; líquido 350; custo 2×20=40.
    expect(Number(sale!.gross_amount)).toBe(400);
    expect(Number(sale!.discount_amount)).toBe(50);
    expect(Number(sale!.net_amount)).toBe(350);
    expect(Number(sale!.direct_costs)).toBe(40);

    const { data: items } = await admin
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale!.id);
    expect(items).toHaveLength(2);

    // Venda criada direto como 'confirmed' já baixa estoque (create_sale
    // aplica os mesmos efeitos de update_sale_status quando nasce num
    // status comprometido — ver migration 20260927011400).
    const { data: levels } = await user.client.rpc("get_inventory_levels");
    const level = (
      levels as { catalog_item_id: string; quantity_on_hand: number }[]
    ).find((l) => l.catalog_item_id === productId);
    expect(level?.quantity_on_hand).toBe(8); // 10 - 2
  });

  it("update_sale_status baixa estoque ao confirmar e lança receita ao pagar", async () => {
    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: productId, quantity: 3 }],
        p_account_id: accountId,
        p_status: "draft",
        p_sale_date: "2026-11-02",
      })
      .single<{ id: string; net_amount: string }>();

    const confirmed = await user.client
      .rpc("update_sale_status", {
        p_sale_id: sale!.id,
        p_new_status: "confirmed",
        p_client_request_id: crypto.randomUUID(),
      })
      .single<{ stock_deducted_at: string | null }>();
    expect(confirmed.error).toBeNull();
    expect(confirmed.data?.stock_deducted_at).not.toBeNull();

    const { data: levelsAfterConfirm } = await user.client.rpc(
      "get_inventory_levels",
    );
    const levelAfterConfirm = (
      levelsAfterConfirm as {
        catalog_item_id: string;
        quantity_on_hand: number;
      }[]
    ).find((l) => l.catalog_item_id === productId);
    expect(levelAfterConfirm?.quantity_on_hand).toBe(5); // 8 - 3

    const paid = await user.client
      .rpc("update_sale_status", {
        p_sale_id: sale!.id,
        p_new_status: "paid",
        p_client_request_id: crypto.randomUUID(),
      })
      .single<{ revenue_transaction_id: string | null }>();
    expect(paid.data?.revenue_transaction_id).not.toBeNull();

    const { data: financeTx } = await admin
      .from("finance_transactions")
      .select("amount, sale_id")
      .eq("id", paid.data!.revenue_transaction_id!)
      .single();
    expect(financeTx?.sale_id).toBe(sale!.id);
  });

  it("get_business_dashboard_summary retorna dados reais, não mock", async () => {
    const { data, error } = await user.client
      .rpc("get_business_dashboard_summary", {
        p_period_start: "2026-11-01",
        p_period_end: "2026-11-30",
      })
      .single<{ sales_count: number; gross_revenue: string }>();

    expect(error).toBeNull();
    expect(Number(data?.sales_count)).toBeGreaterThan(0);
    expect(Number(data?.gross_revenue)).toBeGreaterThan(0);
  });
});
