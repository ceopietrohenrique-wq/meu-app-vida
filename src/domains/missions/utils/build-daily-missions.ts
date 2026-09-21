/**
 * "Missão do dia" não é uma entidade nova no banco — é uma projeção de
 * tarefas de hoje + hábitos elegíveis hoje. Deriva aqui em vez de criar
 * tabela: os dados reais já existem em `tasks` e `habits`/`habit_logs`.
 */
export type MissionSourceTask = {
  id: string;
  title: string;
  status: string;
  xpReward: number;
};

export type MissionSourceHabit = {
  id: string;
  name: string;
  xpReward: number;
  completedToday: boolean;
};

export type DailyMission = {
  key: string;
  type: "task" | "habit";
  id: string;
  title: string;
  completed: boolean;
  xpReward: number;
};

export type DailyMissionsSummary = {
  missions: DailyMission[];
  totalCount: number;
  completedCount: number;
  xpEarned: number;
  xpAvailable: number;
  progressPercent: number;
};

export function buildDailyMissions(
  tasksToday: MissionSourceTask[],
  eligibleHabitsToday: MissionSourceHabit[],
): DailyMissionsSummary {
  const seenKeys = new Set<string>();
  const missions: DailyMission[] = [];

  for (const task of tasksToday) {
    const key = `task:${task.id}`;
    // Guarda contra a mesma tarefa aparecer duas vezes na fonte (ex.: bug
    // upstream juntando listas) virar duas missões na Tela Hoje.
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    missions.push({
      key,
      type: "task",
      id: task.id,
      title: task.title,
      completed: task.status === "concluida",
      xpReward: task.xpReward,
    });
  }

  for (const habit of eligibleHabitsToday) {
    const key = `habit:${habit.id}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    missions.push({
      key,
      type: "habit",
      id: habit.id,
      title: habit.name,
      completed: habit.completedToday,
      xpReward: habit.xpReward,
    });
  }

  const totalCount = missions.length;
  const completedCount = missions.filter((m) => m.completed).length;
  const xpEarned = missions.reduce(
    (sum, m) => sum + (m.completed ? m.xpReward : 0),
    0,
  );
  const xpAvailable = missions.reduce((sum, m) => sum + m.xpReward, 0);
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    missions,
    totalCount,
    completedCount,
    xpEarned,
    xpAvailable,
    progressPercent,
  };
}
