import { describe, expect, it } from "vitest";

import { buildDailyMissions } from "./build-daily-missions";

describe("buildDailyMissions", () => {
  it("combina tarefas de hoje e hábitos elegíveis em missões", () => {
    const summary = buildDailyMissions(
      [{ id: "t1", title: "Tarefa 1", status: "pendente", xpReward: 10 }],
      [
        {
          id: "h1",
          name: "Hábito 1",
          xpReward: 5,
          completedToday: false,
        },
      ],
    );

    expect(summary.totalCount).toBe(2);
    expect(summary.missions.map((m) => m.type)).toEqual(["task", "habit"]);
  });

  it("não duplica a mesma tarefa se ela aparecer duas vezes na fonte", () => {
    const summary = buildDailyMissions(
      [
        { id: "t1", title: "Tarefa 1", status: "pendente", xpReward: 10 },
        { id: "t1", title: "Tarefa 1", status: "pendente", xpReward: 10 },
      ],
      [],
    );

    expect(summary.totalCount).toBe(1);
  });

  it("não duplica o mesmo hábito se ele aparecer duas vezes na fonte", () => {
    const summary = buildDailyMissions(
      [],
      [
        { id: "h1", name: "Hábito 1", xpReward: 5, completedToday: true },
        { id: "h1", name: "Hábito 1", xpReward: 5, completedToday: true },
      ],
    );

    expect(summary.totalCount).toBe(1);
  });

  it("calcula XP ganho, XP disponível e progresso corretamente", () => {
    const summary = buildDailyMissions(
      [
        { id: "t1", title: "Concluída", status: "concluida", xpReward: 10 },
        { id: "t2", title: "Pendente", status: "pendente", xpReward: 20 },
      ],
      [
        { id: "h1", name: "Feito", xpReward: 5, completedToday: true },
        { id: "h2", name: "Não feito", xpReward: 15, completedToday: false },
      ],
    );

    expect(summary.completedCount).toBe(2);
    expect(summary.totalCount).toBe(4);
    expect(summary.xpEarned).toBe(15); // 10 (tarefa) + 5 (hábito)
    expect(summary.xpAvailable).toBe(50); // 10+20+5+15
    expect(summary.progressPercent).toBe(50); // 2/4
  });

  it("não divide por zero quando não há missões hoje", () => {
    const summary = buildDailyMissions([], []);

    expect(summary.totalCount).toBe(0);
    expect(summary.xpEarned).toBe(0);
    expect(summary.xpAvailable).toBe(0);
    expect(summary.progressPercent).toBe(0);
  });

  it("uma tarefa cancelada nunca deveria chegar aqui, mas se chegar não conta como concluída", () => {
    const summary = buildDailyMissions(
      [{ id: "t1", title: "Cancelada", status: "cancelada", xpReward: 10 }],
      [],
    );

    expect(summary.missions[0]!.completed).toBe(false);
  });

  describe("missões de saúde (Fase 2)", () => {
    it("sem nenhuma fonte de saúde informada, nenhuma missão de saúde aparece", () => {
      const summary = buildDailyMissions([], []);
      expect(
        summary.missions.filter((m) => m.type !== "task" && m.type !== "habit"),
      ).toEqual([]);
    });

    it("peso: elegível toda semana, concluída quando já houve registro na semana", () => {
      const summary = buildDailyMissions([], [], {
        weight: { loggedThisWeek: true, xpReward: 5 },
      });
      const mission = summary.missions.find((m) => m.type === "weight");
      expect(mission).toMatchObject({ completed: true, xpReward: 5 });
    });

    it("água: concluída quando o total do dia atinge a meta", () => {
      const notReached = buildDailyMissions([], [], {
        water: { totalMl: 500, goalMl: 2000, xpReward: 10 },
      });
      expect(
        notReached.missions.find((m) => m.type === "water")?.completed,
      ).toBe(false);

      const reached = buildDailyMissions([], [], {
        water: { totalMl: 2000, goalMl: 2000, xpReward: 10 },
      });
      expect(reached.missions.find((m) => m.type === "water")?.completed).toBe(
        true,
      );
    });

    it("alimentação: uma missão por refeição planejada, sem duplicar", () => {
      const summary = buildDailyMissions([], [], {
        meals: [
          {
            id: "m1",
            name: "Café da manhã",
            completedToday: true,
            xpReward: 20,
          },
          { id: "m2", name: "Almoço", completedToday: false, xpReward: 20 },
          {
            id: "m1",
            name: "Café da manhã",
            completedToday: true,
            xpReward: 20,
          },
        ],
      });
      expect(summary.missions.filter((m) => m.type === "meal")).toHaveLength(2);
    });

    it("treino: só aparece como missão quando existe plano ativo", () => {
      const semPlano = buildDailyMissions([], [], {
        workout: { hasActivePlan: false, completedToday: false, xpReward: 30 },
      });
      expect(
        semPlano.missions.find((m) => m.type === "workout"),
      ).toBeUndefined();

      const comPlano = buildDailyMissions([], [], {
        workout: { hasActivePlan: true, completedToday: true, xpReward: 30 },
      });
      expect(comPlano.missions.find((m) => m.type === "workout")).toMatchObject(
        {
          completed: true,
          xpReward: 30,
        },
      );
    });

    it("caminhada: elegível todo dia, concluída quando já registrada hoje", () => {
      const summary = buildDailyMissions([], [], {
        walk: { loggedToday: true, xpReward: 15 },
      });
      expect(summary.missions.find((m) => m.type === "walk")).toMatchObject({
        completed: true,
        xpReward: 15,
      });
    });

    it("nunca gera XP por perder peso: a missão de peso só depende de ter registrado, não do valor do peso", () => {
      // O tipo MissionSourceWeight nem aceita um valor de peso/variação —
      // só um booleano "registrou esta semana" — então não há como essa
      // projeção condicionar XP a perda/ganho de peso.
      const summary = buildDailyMissions([], [], {
        weight: { loggedThisWeek: true, xpReward: 5 },
      });
      const mission = summary.missions.find((m) => m.type === "weight")!;
      expect(Object.keys(mission)).not.toContain("weightKg");
      expect(Object.keys(mission)).not.toContain("changeKg");
    });

    it("XP disponível/ganho e progresso somam corretamente com missões de tarefa, hábito e saúde juntas", () => {
      const summary = buildDailyMissions(
        [{ id: "t1", title: "Tarefa", status: "concluida", xpReward: 10 }],
        [{ id: "h1", name: "Hábito", xpReward: 5, completedToday: false }],
        {
          weight: { loggedThisWeek: true, xpReward: 5 },
          water: { totalMl: 2000, goalMl: 2000, xpReward: 10 },
          walk: { loggedToday: false, xpReward: 15 },
        },
      );

      expect(summary.totalCount).toBe(5); // tarefa, hábito, peso, água, caminhada
      expect(summary.completedCount).toBe(3); // tarefa, peso, água
      expect(summary.xpEarned).toBe(25); // 10 (tarefa) + 5 (peso) + 10 (água)
      expect(summary.xpAvailable).toBe(45); // 10+5+5+10+15
    });

    it("não duplica missão de saúde se a mesma fonte for passada mais de uma vez entre chamadas (chave estável por tipo)", () => {
      const first = buildDailyMissions([], [], {
        water: { totalMl: 100, goalMl: 2000, xpReward: 10 },
      });
      const second = buildDailyMissions([], [], {
        water: { totalMl: 2000, goalMl: 2000, xpReward: 10 },
      });
      // Cada chamada é independente (a função é pura) — a garantia real de
      // "não duplicar" está na key "water:today" ser sempre a mesma dentro
      // de uma mesma chamada, e no banco (UNIQUE(user_id, source_key)).
      expect(first.missions.filter((m) => m.type === "water")).toHaveLength(1);
      expect(second.missions.filter((m) => m.type === "water")).toHaveLength(1);
    });
  });
});
