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
});
