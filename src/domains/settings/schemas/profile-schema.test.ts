import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "./profile-schema";

describe("updateProfileSchema", () => {
  const base = {
    name: "Pietro",
    timezone: "America/Sao_Paulo",
    weekStart: "1",
    currency: "brl",
    weeklyXpGoal: "500",
  };

  it("aceita dados válidos e converte tipos numéricos", () => {
    const result = updateProfileSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weekStart).toBe(1);
      expect(result.data.weeklyXpGoal).toBe(500);
    }
  });

  it("rejeita week_start fora do intervalo 0-6", () => {
    const result = updateProfileSchema.safeParse({ ...base, weekStart: "9" });
    expect(result.success).toBe(false);
  });

  it("rejeita meta semanal de XP negativa", () => {
    const result = updateProfileSchema.safeParse({
      ...base,
      weeklyXpGoal: "-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const result = updateProfileSchema.safeParse({ ...base, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejeita moeda que não tenha 3 letras", () => {
    const result = updateProfileSchema.safeParse({ ...base, currency: "R$" });
    expect(result.success).toBe(false);
  });
});
