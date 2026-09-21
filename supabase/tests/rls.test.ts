import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAdminTestClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./helpers";

/**
 * Prova, contra um Supabase real (com as migrations de supabase/migrations
 * aplicadas), que RLS protege profiles e life_areas: cada usuário só
 * acessa os próprios dados, mesmo tentando explicitamente ler/editar/excluir
 * dados de outro usuário pelo id. Ver CLAUDE.md > SEGURANÇA e
 * docs/architecture.md > 4. Autenticação e autorização.
 */
describe("RLS: profiles e life_areas", () => {
  let admin: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    admin = createAdminTestClient();
    userA = await createTestUser(admin, "a");
    userB = await createTestUser(admin, "b");
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(admin, userA.id);
    if (userB) await deleteTestUser(admin, userB.id);
  });

  describe("profiles", () => {
    it("usuário consegue ler o próprio profile (criado automaticamente no cadastro)", async () => {
      const { data, error } = await userA.client
        .from("profiles")
        .select("*")
        .eq("id", userA.id)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(userA.id);
    });

    it("usuário consegue atualizar o próprio profile", async () => {
      const { data, error } = await userA.client
        .from("profiles")
        .update({ name: "Usuário A atualizado" })
        .eq("id", userA.id)
        .select("*")
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe("Usuário A atualizado");
    });

    it("usuário A não consegue LER o profile do usuário B", async () => {
      const { data, error } = await userA.client
        .from("profiles")
        .select("*")
        .eq("id", userB.id)
        .maybeSingle();

      // RLS filtra a linha: sem erro de permissão explícito, mas também
      // sem dado nenhum — é assim que SELECT com RLS nega acesso.
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("usuário A não consegue EDITAR o profile do usuário B", async () => {
      const { data } = await userA.client
        .from("profiles")
        .update({ name: "Hackeado pelo usuário A" })
        .eq("id", userB.id)
        .select("*");

      // Nenhuma linha é retornada/afetada — o update não teve efeito.
      expect(data).toEqual([]);

      const { data: realProfileB } = await admin
        .from("profiles")
        .select("name")
        .eq("id", userB.id)
        .single();
      expect(realProfileB?.name).not.toBe("Hackeado pelo usuário A");
    });

    it("usuário A não consegue EXCLUIR o profile do usuário B", async () => {
      const { data } = await userA.client
        .from("profiles")
        .delete()
        .eq("id", userB.id)
        .select("*");

      expect(data).toEqual([]);

      const { data: stillExists } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userB.id)
        .maybeSingle();
      expect(stillExists?.id).toBe(userB.id);
    });
  });

  describe("life_areas", () => {
    let areaOfUserA: { id: string };

    beforeAll(async () => {
      const { data, error } = await userA.client
        .from("life_areas")
        .insert({ name: "Área privada de A", user_id: userA.id })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Falha ao preparar fixture: ${error?.message}`);
      }
      areaOfUserA = data;
    });

    it("usuário consegue criar e ler a própria life_area", async () => {
      const { data, error } = await userA.client
        .from("life_areas")
        .select("*")
        .eq("id", areaOfUserA.id)
        .single();

      expect(error).toBeNull();
      expect(data?.user_id).toBe(userA.id);
    });

    it("usuário B não consegue LER a life_area do usuário A", async () => {
      const { data, error } = await userB.client
        .from("life_areas")
        .select("*")
        .eq("id", areaOfUserA.id)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("usuário B não consegue EDITAR a life_area do usuário A", async () => {
      const { data } = await userB.client
        .from("life_areas")
        .update({ name: "Hackeado pelo usuário B" })
        .eq("id", areaOfUserA.id)
        .select("*");

      expect(data).toEqual([]);

      const { data: realArea } = await admin
        .from("life_areas")
        .select("name")
        .eq("id", areaOfUserA.id)
        .single();
      expect(realArea?.name).toBe("Área privada de A");
    });

    it("usuário B não consegue EXCLUIR a life_area do usuário A", async () => {
      const { data } = await userB.client
        .from("life_areas")
        .delete()
        .eq("id", areaOfUserA.id)
        .select("*");

      expect(data).toEqual([]);

      const { data: stillExists } = await admin
        .from("life_areas")
        .select("id")
        .eq("id", areaOfUserA.id)
        .maybeSingle();
      expect(stillExists?.id).toBe(areaOfUserA.id);
    });

    it("usuário B não vê a área do usuário A ao listar as próprias life_areas", async () => {
      const { data, error } = await userB.client
        .from("life_areas")
        .select("id");

      expect(error).toBeNull();
      expect(data?.some((row) => row.id === areaOfUserA.id)).toBe(false);
    });
  });
});
