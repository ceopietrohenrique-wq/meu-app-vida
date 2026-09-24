import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { exportTransactionsCsv } from "@/domains/finance/services/export-service";
import { buildUserBackup } from "@/domains/export/services/backup-service";
import { exportSalesCsv } from "@/domains/sales/services/export-service";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Auditoria pós-Fase 8 > Exportação/Backup. Prova, contra um Supabase
 * real, que: (1) cada export só enxerga dado do próprio usuário
 * autenticado — nunca aceita um userId vindo de fora, sempre RLS via
 * auth.uid(); (2) dataset vazio nunca quebra; (3) o backup nunca inclui
 * push_subscriptions/scheduled_notifications; (4) valores monetários
 * chegam intactos (string decimal, nunca float).
 */
describe("Exportação/Backup — isolamento e integridade (banco real)", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "export-a");
    userB = await createTestUser(admin, "export-b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  it("CSV de transações: usuário A nunca vê transação de B, mesmo pedindo tudo sem filtro", async () => {
    await admin.from("finance_accounts").insert({
      user_id: userA.id,
      name: "Conta A",
      type: "conta_bancaria",
      context: "pessoal",
    });
    await admin.from("finance_accounts").insert({
      user_id: userB.id,
      name: "Conta B",
      type: "conta_bancaria",
      context: "pessoal",
    });
    const { data: accountA } = await userA.client
      .from("finance_accounts")
      .select("id")
      .single();
    const { data: accountB } = await userB.client
      .from("finance_accounts")
      .select("id")
      .single();

    await userA.client.rpc("create_finance_transaction", {
      p_account_id: accountA!.id,
      p_type: "expense",
      p_context: "pessoal",
      p_amount: "42.50",
      p_transaction_date: "2026-09-20",
      p_description: "Transação exclusiva de A",
    });
    await userB.client.rpc("create_finance_transaction", {
      p_account_id: accountB!.id,
      p_type: "expense",
      p_context: "pessoal",
      p_amount: "999.99",
      p_transaction_date: "2026-09-20",
      p_description: "Transação exclusiva de B — nunca deve aparecer para A",
    });

    const csvA = await exportTransactionsCsv(userA.client);
    expect(csvA).toContain("Transação exclusiva de A");
    expect(csvA).toContain("42.50");
    expect(csvA).not.toContain("exclusiva de B");
    expect(csvA).not.toContain("999.99");

    const csvB = await exportTransactionsCsv(userB.client);
    expect(csvB).toContain("exclusiva de B");
    expect(csvB).not.toContain("exclusiva de A");
  });

  it("CSV de transações: dataset vazio produz CSV válido só com cabeçalho", async () => {
    const emptyUser = await createTestUser(admin, "export-empty-tx");
    try {
      const csv = await exportTransactionsCsv(emptyUser.client);
      expect(csv).toContain("data,descricao,tipo,categoria,conta,valor");
      const dataLines = csv.replace(/^﻿/, "").trim().split("\r\n");
      expect(dataLines).toHaveLength(1); // só o cabeçalho
    } finally {
      await deleteTestUser(admin, emptyUser.id);
    }
  });

  it("CSV de vendas: usuário A nunca vê venda de B, e lucro/margem batem com a fórmula oficial", async () => {
    const { data: catalogA } = await admin
      .from("catalog_items")
      .insert({
        user_id: userA.id,
        name: "Produto A",
        type: "produto",
        default_price: 100,
        default_cost: 40,
      })
      .select("id")
      .single();

    const sale = await userA.client
      .rpc("create_sale", {
        p_client_request_id: crypto.randomUUID(),
        p_items: [{ catalog_item_id: catalogA!.id, quantity: 1 }],
        p_status: "confirmed",
      })
      .single<{ id: string }>();
    expect(sale.error).toBeNull();

    const csvA = await exportSalesCsv(userA.client);
    // receita líquida 100,00; custo 40,00; lucro gerencial 60,00; margem 60%.
    const dataRow = csvA.replace(/^﻿/, "").trim().split("\r\n")[1]!;
    expect(dataRow).toContain("confirmada");
    expect(dataRow).toContain("100.00"); // receita
    expect(dataRow).toContain("40.00"); // custo
    expect(dataRow).toContain("60.00"); // lucro gerencial
    expect(dataRow).toContain("60.00"); // margem_percent (60/100*100)

    const csvB = await exportSalesCsv(userB.client);
    expect(csvB).not.toContain("Produto A");
  });

  it("Backup JSON: usuário A nunca recebe linha de B em nenhum domínio, e nunca inclui push_subscriptions/scheduled_notifications", async () => {
    await admin.from("tasks").insert({
      user_id: userA.id,
      title: "Tarefa exclusiva de A para o backup",
    });
    await admin.from("tasks").insert({
      user_id: userB.id,
      title: "Tarefa exclusiva de B — nunca deve aparecer no backup de A",
    });
    await admin.from("push_subscriptions").insert({
      user_id: userA.id,
      endpoint: `https://push.example.com/backup-test-${Date.now()}`,
      p256dh: "key",
      auth: "key",
    });

    const backupA = await buildUserBackup(userA.client);

    expect(backupA.backupFormat).toBe("meu-app-vida-backup");
    expect(backupA.schemaVersion).toBe(1);
    expect(new Date(backupA.generatedAt).toString()).not.toBe("Invalid Date");

    const tasksA = backupA.domains.tarefas_habitos?.tarefas as
      { title: string }[] | undefined;
    expect(
      tasksA?.some((t) => t.title === "Tarefa exclusiva de A para o backup"),
    ).toBe(true);
    expect(tasksA?.some((t) => t.title.includes("exclusiva de B"))).toBe(false);

    const allDomainKeys = Object.values(backupA.domains).flatMap((d) =>
      Object.keys(d),
    );
    expect(allDomainKeys).not.toContain("push_subscriptions");
    expect(allDomainKeys.join(",")).not.toMatch(/scheduled_notifications/);

    // Confirma que nenhuma linha do backup carrega user_id (removido de
    // propósito — ver stripUserId em backup-service.ts).
    const anyRowHasUserId = Object.values(backupA.domains).some((group) =>
      Object.values(group).some((rows) =>
        (rows as Record<string, unknown>[]).some((r) => "user_id" in r),
      ),
    );
    expect(anyRowHasUserId).toBe(false);
  });

  it("Backup JSON: domínio com módulo vazio continua válido (array vazio, nunca erro)", async () => {
    const emptyUser = await createTestUser(admin, "export-empty-backup");
    try {
      const backup = await buildUserBackup(emptyUser.client);
      expect(backup.domains.negocios?.vendas).toEqual([]);
      expect(backup.domains.financeiro?.transacoes).toEqual([]);
    } finally {
      await deleteTestUser(admin, emptyUser.id);
    }
  });
});
