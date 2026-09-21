import { describe, expect, it } from "vitest";

import { toFriendlyAuthErrorMessage } from "./auth-errors";

describe("toFriendlyAuthErrorMessage", () => {
  it("traduz credenciais inválidas", () => {
    expect(toFriendlyAuthErrorMessage("Invalid login credentials")).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("traduz usuário já cadastrado", () => {
    expect(toFriendlyAuthErrorMessage("User already registered")).toBe(
      "Já existe uma conta com este e-mail.",
    );
  });

  it("nunca expõe a mensagem técnica original para um erro desconhecido", () => {
    const result = toFriendlyAuthErrorMessage("PostgrestError PGRST116");
    expect(result).not.toContain("PGRST116");
    expect(result).not.toContain("PostgrestError");
  });
});
