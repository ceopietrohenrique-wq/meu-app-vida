import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real, que nenhuma entidade de Negócios
 * (negócio, cliente/lead, follow-up/interação, catálogo, oferta, venda,
 * sale_items, estoque, movimentação) é visível ou editável por outro
 * usuário, e que uma venda não pode referenciar cliente/produto/estoque de
 * outro usuário. Ver docs/business-rules.md > Fase 5.
 */
describe("RLS — Fase 5 (Negócios)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "fase5-a");
    userB = await createTestUser(admin, "fase5-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("businesses: isolado por usuário, incluindo update/delete", async () => {
    const { data: business, error } = await userA.client
      .from("businesses")
      .insert({ name: "Negócio A" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("businesses")
      .select("id")
      .eq("id", business!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("businesses")
      .update({ name: "hackeado" })
      .eq("id", business!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    const { data: deletedByB } = await userB.client
      .from("businesses")
      .delete()
      .eq("id", business!.id)
      .select("id");
    expect(deletedByB).toEqual([]);
  });

  it("customers e customer_interactions: isolados por usuário", async () => {
    const { data: customer, error } = await userA.client
      .from("customers")
      .insert({ name: "Cliente A" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("customers")
      .select("id")
      .eq("id", customer!.id);
    expect(seenByB).toEqual([]);

    const { data: updatedByB } = await userB.client
      .from("customers")
      .update({ stage: "fechado" })
      .eq("id", customer!.id)
      .select("id");
    expect(updatedByB).toEqual([]);

    // B não consegue registrar interação no cliente de A.
    const { error: interactionError } = await userB.client
      .from("customer_interactions")
      .insert({ customer_id: customer!.id, type: "ligacao" });
    expect(interactionError).not.toBeNull();

    const { data: interactionA } = await userA.client
      .from("customer_interactions")
      .insert({ customer_id: customer!.id, type: "ligacao", notes: "Ligou" })
      .select("id")
      .single();

    const { data: interactionSeenByB } = await userB.client
      .from("customer_interactions")
      .select("id")
      .eq("id", interactionA!.id);
    expect(interactionSeenByB).toEqual([]);
  });

  it("catalog_items: isolado por usuário", async () => {
    const { data: item, error } = await userA.client
      .from("catalog_items")
      .insert({ name: "Item A", type: "produto", default_price: "10.00" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("catalog_items")
      .select("id")
      .eq("id", item!.id);
    expect(seenByB).toEqual([]);
  });

  it("offers e offer_items: isolados por usuário, oferta não pode usar item de catálogo de outro usuário", async () => {
    const { data: itemA } = await userA.client
      .from("catalog_items")
      .insert({
        name: "Item oferta A",
        type: "servico",
        default_price: "50.00",
      })
      .select("id")
      .single();
    const { data: itemB } = await userB.client
      .from("catalog_items")
      .insert({
        name: "Item oferta B",
        type: "servico",
        default_price: "50.00",
      })
      .select("id")
      .single();

    const { data: offer } = await userA.client
      .from("offers")
      .insert({ name: "Oferta A" })
      .select("id")
      .single();

    const { data: seenByB } = await userB.client
      .from("offers")
      .select("id")
      .eq("id", offer!.id);
    expect(seenByB).toEqual([]);

    const { error: crossItemError } = await userA.client
      .from("offer_items")
      .insert({ offer_id: offer!.id, catalog_item_id: itemB!.id, quantity: 1 });
    expect(crossItemError).not.toBeNull();

    const { data: offerItemA } = await userA.client
      .from("offer_items")
      .insert({ offer_id: offer!.id, catalog_item_id: itemA!.id, quantity: 1 })
      .select("id")
      .single();

    const { data: offerItemSeenByB } = await userB.client
      .from("offer_items")
      .select("id")
      .eq("id", offerItemA!.id);
    expect(offerItemSeenByB).toEqual([]);
  });

  it("sales e sale_items: isolados por usuário, venda não pode referenciar cliente/produto de outro usuário", async () => {
    const { data: accountA } = await userA.client
      .from("finance_accounts")
      .insert({
        name: "Caixa A",
        type: "caixa_empresa",
        context: "empresarial",
      })
      .select("id")
      .single();
    const { data: productA } = await userA.client
      .from("catalog_items")
      .insert({
        name: "Produto venda A",
        type: "produto",
        default_price: "20.00",
      })
      .select("id")
      .single();
    const { data: productB } = await userB.client
      .from("catalog_items")
      .insert({
        name: "Produto venda B",
        type: "produto",
        default_price: "20.00",
      })
      .select("id")
      .single();
    const { data: customerB } = await userB.client
      .from("customers")
      .insert({ name: "Cliente de B" })
      .select("id")
      .single();

    const { data: sale, error } = await userA.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: productA!.id, quantity: 1 }],
        p_account_id: accountA!.id,
        p_sale_date: "2026-12-01",
      })
      .single<{ id: string }>();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("sales")
      .select("id")
      .eq("id", sale!.id);
    expect(seenByB).toEqual([]);

    const { data: itemsSeenByB } = await userB.client
      .from("sale_items")
      .select("id")
      .eq("sale_id", sale!.id);
    expect(itemsSeenByB).toEqual([]);

    // B não consegue transicionar o status da venda de A.
    const { error: statusErrorForB } = await userB.client.rpc(
      "update_sale_status",
      {
        p_sale_id: sale!.id,
        p_new_status: "confirmed",
      },
    );
    expect(statusErrorForB).not.toBeNull();

    // A não consegue criar uma venda usando produto de B nem cliente de B.
    const { error: crossProductError } = await userA.client.rpc("create_sale", {
      p_client_request_id: crypto.randomUUID(),
      p_items: [{ catalog_item_id: productB!.id, quantity: 1 }],
      p_sale_date: "2026-12-01",
    });
    expect(crossProductError).not.toBeNull();

    const { error: crossCustomerError } = await userA.client.rpc(
      "create_sale",
      {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: productA!.id, quantity: 1 }],
        p_customer_id: customerB!.id,
        p_sale_date: "2026-12-01",
      },
    );
    expect(crossCustomerError).not.toBeNull();
  });

  it("estoque (inventory_settings/inventory_movements): isolado por usuário", async () => {
    const { data: productA } = await userA.client
      .from("catalog_items")
      .insert({
        name: "Produto estoque A",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();
    const { data: productB } = await userB.client
      .from("catalog_items")
      .insert({
        name: "Produto estoque B",
        type: "produto",
        default_price: "10.00",
        tracks_inventory: true,
      })
      .select("id")
      .single();

    const { data: movementA, error } = await userA.client
      .from("inventory_movements")
      .insert({
        catalog_item_id: productA!.id,
        type: "entrada",
        quantity_delta: 5,
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: seenByB } = await userB.client
      .from("inventory_movements")
      .select("id")
      .eq("id", movementA!.id);
    expect(seenByB).toEqual([]);

    // B não consegue lançar movimentação no produto de A.
    const { error: crossProductError } = await userB.client
      .from("inventory_movements")
      .insert({
        catalog_item_id: productA!.id,
        type: "entrada",
        quantity_delta: 5,
      });
    expect(crossProductError).not.toBeNull();

    // Cada usuário só enxerga o próprio nível de estoque via
    // get_inventory_levels (RLS + filtro por auth.uid() dentro da função).
    const levelsForA = await userA.client.rpc("get_inventory_levels");
    const levelsForB = await userB.client.rpc("get_inventory_levels");
    expect(
      (levelsForA.data as { catalog_item_id: string }[]).some(
        (l) => l.catalog_item_id === productB!.id,
      ),
    ).toBe(false);
    expect(
      (levelsForB.data as { catalog_item_id: string }[]).some(
        (l) => l.catalog_item_id === productA!.id,
      ),
    ).toBe(false);
  });
});
