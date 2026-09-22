import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

type SaleRow = { id: string; status: string; stock_deducted_at: string | null };

/**
 * Prova, contra um Supabase real, que double-submit (chamadas concorrentes)
 * em operações críticas de venda nunca duplica venda, baixa de estoque,
 * movimentação financeira ou lançamento — CLAUDE.md > Fase 5 > 10.
 */
describe("Negócios — idempotência e concorrência (Fase 5)", () => {
  let admin: SupabaseClient;
  let user: TestUser;
  let accountId: string;

  beforeAll(async () => {
    admin = createAdminTestClient();
    user = await createTestUser(admin, "sales-idempotency");

    const { data: account } = await user.client
      .from("finance_accounts")
      .insert({
        name: "Caixa idempotência",
        type: "caixa_empresa",
        context: "empresarial",
      })
      .select("id")
      .single();
    accountId = account!.id;
  });

  afterAll(async () => {
    if (user) await deleteTestUser(admin, user.id);
  });

  it("create_sale: duas chamadas concorrentes com a mesma client_request_id criam uma única venda", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item double-submit venda",
        type: "servico",
        default_price: "77.00",
      })
      .select("id")
      .single();

    const clientRequestId = crypto.randomUUID();
    const params = {
      p_client_request_id: clientRequestId,
      p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
      p_sale_date: "2026-12-20",
    };

    const [first, second] = await Promise.all([
      user.client.rpc("create_sale", params).single(),
      user.client.rpc("create_sale", params).single(),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { data: sales } = await admin
      .from("sales")
      .select("id")
      .eq("client_request_id", clientRequestId);
    expect(sales).toHaveLength(1);

    const { data: items } = await admin
      .from("sale_items")
      .select("id")
      .eq("sale_id", sales![0]!.id);
    expect(items).toHaveLength(1);
  });

  it("update_sale_status: duas chamadas concorrentes confirmando a mesma venda baixam o estoque uma única vez", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto double-submit estoque",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    await user.client.from("inventory_movements").insert({
      catalog_item_id: catalogItem!.id,
      type: "entrada",
      quantity_delta: 20,
    });

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 5 }],
        p_status: "draft",
        p_sale_date: "2026-12-21",
      })
      .single<SaleRow>();

    // Concorrência real: duas chamadas simultâneas, CADA UMA com sua
    // própria client_request_id (não é reenvio idêntico — é o cenário mais
    // difícil: o guard precisa ser o lock de linha + stock_deducted_at, não
    // só o dedup de client_request_id).
    const [first, second] = await Promise.all([
      user.client
        .rpc("update_sale_status", {
          p_sale_id: sale!.id,
          p_new_status: "confirmed",
          p_client_request_id: crypto.randomUUID(),
        })
        .single<SaleRow>(),
      user.client
        .rpc("update_sale_status", {
          p_sale_id: sale!.id,
          p_new_status: "confirmed",
          p_client_request_id: crypto.randomUUID(),
        })
        .single<SaleRow>(),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { data: movements } = await admin
      .from("inventory_movements")
      .select("id, quantity_delta")
      .eq("reference_sale_id", sale!.id)
      .eq("type", "venda");
    expect(movements).toHaveLength(1);
    expect(movements![0]!.quantity_delta).toBe(-5);

    const { data: levels } = await user.client.rpc("get_inventory_levels");
    const level = (
      levels as { catalog_item_id: string; quantity_on_hand: number }[]
    ).find((l) => l.catalog_item_id === catalogItem!.id);
    expect(level?.quantity_on_hand).toBe(15); // 20 - 5, nunca 20 - 10
  });

  it("update_sale_status: reenviar a mesma client_request_id não reaplica o efeito (idempotência de retry)", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item retry status",
        type: "servico",
        default_price: "40.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_account_id: accountId,
        p_status: "confirmed",
        p_sale_date: "2026-12-22",
      })
      .single<SaleRow>();

    const clientRequestId = crypto.randomUUID();
    const first = await user.client
      .rpc("update_sale_status", {
        p_sale_id: sale!.id,
        p_new_status: "paid",
        p_client_request_id: clientRequestId,
      })
      .single<{ revenue_transaction_id: string }>();
    const second = await user.client
      .rpc("update_sale_status", {
        p_sale_id: sale!.id,
        p_new_status: "paid",
        p_client_request_id: clientRequestId,
      })
      .single<{ revenue_transaction_id: string }>();

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data!.revenue_transaction_id).toBe(
      second.data!.revenue_transaction_id,
    );

    const { data: financeTx } = await admin
      .from("finance_transactions")
      .select("id")
      .eq("sale_id", sale!.id);
    expect(financeTx).toHaveLength(1);
  });

  it("update_sale_status: chamar 'paid' duas vezes (sequencial, sem client_request_id) nunca duplica a receita", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Item paid duplo",
        type: "servico",
        default_price: "60.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_account_id: accountId,
        p_status: "confirmed",
        p_sale_date: "2026-12-23",
      })
      .single<SaleRow>();

    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "paid",
    });
    // Sem client_request_id (nenhuma proteção de dedup de retry), mas o
    // guard real (revenue_transaction_id) ainda impede duplicar.
    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "paid",
    });

    const { data: financeTx } = await admin
      .from("finance_transactions")
      .select("id")
      .eq("sale_id", sale!.id);
    expect(financeTx).toHaveLength(1);
  });

  it("estoque insuficiente bloqueia a confirmação e não deixa saldo negativo", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto sem estoque",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 3 }],
        p_status: "draft",
        p_sale_date: "2026-12-24",
      })
      .single<SaleRow>();

    const { error } = await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "confirmed",
    });
    expect(error).not.toBeNull();

    const { data: levels } = await user.client.rpc("get_inventory_levels");
    const level = (
      levels as { catalog_item_id: string; quantity_on_hand: number }[]
    ).find((l) => l.catalog_item_id === catalogItem!.id);
    expect(level?.quantity_on_hand).toBe(0);
  });

  it("cancelar/reembolsar uma venda confirmada reverte o estoque uma única vez", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto estorno",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    await user.client.from("inventory_movements").insert({
      catalog_item_id: catalogItem!.id,
      type: "entrada",
      quantity_delta: 10,
    });

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 4 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-25",
      })
      .single<SaleRow>();

    const levelsAfterConfirm = await user.client.rpc("get_inventory_levels");
    expect(
      (
        levelsAfterConfirm.data as {
          catalog_item_id: string;
          quantity_on_hand: number;
        }[]
      ).find((l) => l.catalog_item_id === catalogItem!.id)?.quantity_on_hand,
    ).toBe(6); // 10 - 4

    // Cancela duas vezes seguidas — a reversão só pode acontecer uma vez.
    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "cancelled",
    });
    await user.client.rpc("update_sale_status", {
      p_sale_id: sale!.id,
      p_new_status: "cancelled",
    });

    const levelsAfterCancel = await user.client.rpc("get_inventory_levels");
    expect(
      (
        levelsAfterCancel.data as {
          catalog_item_id: string;
          quantity_on_hand: number;
        }[]
      ).find((l) => l.catalog_item_id === catalogItem!.id)?.quantity_on_hand,
    ).toBe(10); // 6 + 4 de volta, nunca 6 + 4 + 4

    const { data: estornos } = await admin
      .from("inventory_movements")
      .select("id")
      .eq("reference_sale_id", sale!.id)
      .eq("type", "estorno");
    expect(estornos).toHaveLength(1);
  });

  it("serviço nunca gera movimentação de estoque", async () => {
    const { data: serviceItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Serviço sem estoque",
        type: "servico",
        default_price: "100.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: serviceItem!.id, quantity: 1 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-26",
      })
      .single<SaleRow>();

    const { data: movements } = await admin
      .from("inventory_movements")
      .select("id")
      .eq("reference_sale_id", sale!.id);
    expect(movements).toEqual([]);
  });

  it("item de catálogo sem controle de estoque não gera movimentação mesmo sendo produto", async () => {
    const { data: productItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto sem controle",
        type: "produto",
        default_price: "15.00",
        tracks_inventory: false,
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: productItem!.id, quantity: 2 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-27",
      })
      .single<SaleRow>();

    const { data: movements } = await admin
      .from("inventory_movements")
      .select("id")
      .eq("reference_sale_id", sale!.id);
    expect(movements).toEqual([]);
  });

  it("movimentação manual de estoque: double-submit nunca duplica a movimentação", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto ajuste manual",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    const clientRequestId = crypto.randomUUID();
    const insertMovement = () =>
      user.client.from("inventory_movements").insert({
        catalog_item_id: catalogItem!.id,
        type: "entrada",
        quantity_delta: 7,
        client_request_id: clientRequestId,
      });

    const results = await Promise.all([insertMovement(), insertMovement()]);
    // Uma das duas pode falhar com unique_violation — o que importa é que
    // no máximo uma linha existe de verdade.
    expect(results.some((r) => r.error === null)).toBe(true);

    const { data: movements } = await admin
      .from("inventory_movements")
      .select("id")
      .eq("client_request_id", clientRequestId);
    expect(movements).toHaveLength(1);
  });

  it("create_sale nascendo direto como 'confirmed' já baixa estoque e valida disponibilidade", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Produto confirmed na criação",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    await user.client.from("inventory_movements").insert({
      catalog_item_id: catalogItem!.id,
      type: "entrada",
      quantity_delta: 3,
    });

    // Pedir mais do que existe deve falhar — mesmo nascendo 'confirmed'
    // direto em create_sale, não só via update_sale_status.
    const { error: insufficientError } = await user.client.rpc("create_sale", {
      p_client_request_id: crypto.randomUUID(),
      p_items: [{ catalog_item_id: catalogItem!.id, quantity: 10 }],
      p_status: "confirmed",
      p_sale_date: "2026-12-28",
    });
    expect(insufficientError).not.toBeNull();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 2 }],
        p_status: "confirmed",
        p_sale_date: "2026-12-28",
      })
      .single<SaleRow>();
    expect(sale!.stock_deducted_at).not.toBeNull();

    const { data: levels } = await user.client.rpc("get_inventory_levels");
    const level = (
      levels as { catalog_item_id: string; quantity_on_hand: number }[]
    ).find((l) => l.catalog_item_id === catalogItem!.id);
    expect(level?.quantity_on_hand).toBe(1); // 3 - 2 (a tentativa insuficiente nunca foi aplicada)
  });

  it("create_sale nascendo direto como 'paid' já lança a receita vinculada", async () => {
    const { data: catalogItem } = await user.client
      .from("catalog_items")
      .insert({
        name: "Serviço paid na criação",
        type: "servico",
        default_price: "120.00",
      })
      .select("id")
      .single();

    const { data: sale } = await user.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogItem!.id, quantity: 1 }],
        p_account_id: accountId,
        p_status: "paid",
        p_sale_date: "2026-12-29",
      })
      .single<{ id: string; revenue_transaction_id: string | null }>();

    expect(sale!.revenue_transaction_id).not.toBeNull();

    const { data: financeTx } = await admin
      .from("finance_transactions")
      .select("amount, sale_id")
      .eq("id", sale!.revenue_transaction_id!)
      .single();
    expect(Number(financeTx?.amount)).toBe(120);
    expect(financeTx?.sale_id).toBe(sale!.id);
  });
});
