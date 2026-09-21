/**
 * "Missão do dia" não é uma entidade nova no banco — é uma projeção de
 * tarefas de hoje + hábitos elegíveis hoje + comportamentos de saúde
 * elegíveis hoje (Fase 2) + comportamentos espirituais elegíveis hoje
 * (Fase 3). Deriva aqui em vez de criar tabela: os dados reais já existem
 * em `tasks`, `habits`/`habit_logs`, nas tabelas de saúde (weight_logs,
 * water_logs, meal_logs, workout_sessions, walk_logs) e nas tabelas
 * espirituais (devotionals, reading_plan_logs).
 *
 * IMPORTANTE: esta função só decide o que MOSTRAR e se algo já está
 * concluído — ela nunca concede XP. O XP real continua vindo só das RPCs
 * (complete_task, complete_habit, log_weight, log_water,
 * set_meal_log_status, complete_workout_session, log_walk, log_devotional,
 * complete_reading_day), cada uma com sua própria garantia de idempotência
 * via `xp_events`. Os `xpReward` aqui são só para exibir "XP
 * disponível/ganho" coerente com o que essas RPCs já concedem (valores em
 * docs/business-rules.md > 7 e > 14).
 */
/**
 * Valores de XP de saúde — precisam ficar em sincronia manual com as
 * constantes `v_xp_amount` das RPCs em supabase/migrations (log_weight=5,
 * log_water=10, set_meal_log_status=20, complete_workout_session=30,
 * log_walk=15). Centralizados aqui para não haver um número mágico
 * diferente em cada tela que monta as fontes de missão de saúde.
 */
export const HEALTH_MISSION_XP = {
  WEIGHT: 5,
  WATER: 10,
  MEAL: 20,
  WORKOUT: 30,
  WALK: 15,
} as const;

/**
 * Idem para XP espiritual — precisa ficar em sincronia manual com
 * `v_xp_amount` em log_devotional/complete_reading_day (Fase 3). Valores
 * deliberadamente modestos (docs/business-rules.md > 14): espiritualidade
 * não é pontuação.
 */
export const SPIRITUAL_MISSION_XP = {
  DEVOTIONAL: 10,
  READING_PLAN: 10,
} as const;

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

/** Registrar peso é elegível toda semana (XP semanal, não diário). */
export type MissionSourceWeight = {
  loggedThisWeek: boolean;
  xpReward: number;
};

export type MissionSourceWater = {
  totalMl: number;
  goalMl: number;
  xpReward: number;
};

/** Uma missão por refeição planejada ativa. */
export type MissionSourceMeal = {
  id: string;
  name: string;
  completedToday: boolean;
  xpReward: number;
};

/** Só é elegível se o usuário já tem algum plano de treino ativo. */
export type MissionSourceWorkout = {
  hasActivePlan: boolean;
  completedToday: boolean;
  xpReward: number;
};

export type MissionSourceWalk = {
  loggedToday: boolean;
  xpReward: number;
};

export type HealthMissionSources = {
  weight?: MissionSourceWeight;
  water?: MissionSourceWater;
  meals?: MissionSourceMeal[];
  workout?: MissionSourceWorkout;
  walk?: MissionSourceWalk;
};

/** Devocional é elegível todo dia — checklist completo = concluído. */
export type MissionSourceDevotional = {
  checklistComplete: boolean;
  xpReward: number;
};

/** Só é elegível se existe um plano de leitura ativo. */
export type MissionSourceReadingPlan = {
  hasActivePlan: boolean;
  completedToday: boolean;
  xpReward: number;
};

export type SpiritualMissionSources = {
  devotional?: MissionSourceDevotional;
  readingPlan?: MissionSourceReadingPlan;
};

export type DailyMission = {
  key: string;
  type:
    | "task"
    | "habit"
    | "weight"
    | "water"
    | "meal"
    | "workout"
    | "walk"
    | "devotional"
    | "reading_plan";
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
  health: HealthMissionSources = {},
  spiritual: SpiritualMissionSources = {},
): DailyMissionsSummary {
  const seenKeys = new Set<string>();
  const missions: DailyMission[] = [];

  function addMission(mission: DailyMission) {
    // Guarda contra a mesma fonte aparecer duas vezes (ex.: bug upstream
    // juntando listas) virar duas missões na Tela Hoje.
    if (seenKeys.has(mission.key)) return;
    seenKeys.add(mission.key);
    missions.push(mission);
  }

  for (const task of tasksToday) {
    addMission({
      key: `task:${task.id}`,
      type: "task",
      id: task.id,
      title: task.title,
      completed: task.status === "concluida",
      xpReward: task.xpReward,
    });
  }

  for (const habit of eligibleHabitsToday) {
    addMission({
      key: `habit:${habit.id}`,
      type: "habit",
      id: habit.id,
      title: habit.name,
      completed: habit.completedToday,
      xpReward: habit.xpReward,
    });
  }

  if (health.weight) {
    addMission({
      key: "weight:week",
      type: "weight",
      id: "weight",
      title: "Registrar peso",
      completed: health.weight.loggedThisWeek,
      xpReward: health.weight.xpReward,
    });
  }

  if (health.water) {
    addMission({
      key: "water:today",
      type: "water",
      id: "water",
      title: "Atingir meta de água",
      completed: health.water.totalMl >= health.water.goalMl,
      xpReward: health.water.xpReward,
    });
  }

  for (const meal of health.meals ?? []) {
    addMission({
      key: `meal:${meal.id}`,
      type: "meal",
      id: meal.id,
      title: meal.name,
      completed: meal.completedToday,
      xpReward: meal.xpReward,
    });
  }

  if (health.workout?.hasActivePlan) {
    addMission({
      key: "workout:today",
      type: "workout",
      id: "workout",
      title: "Concluir treino",
      completed: health.workout.completedToday,
      xpReward: health.workout.xpReward,
    });
  }

  if (health.walk) {
    addMission({
      key: "walk:today",
      type: "walk",
      id: "walk",
      title: "Caminhada",
      completed: health.walk.loggedToday,
      xpReward: health.walk.xpReward,
    });
  }

  if (spiritual.devotional) {
    addMission({
      key: "devotional:today",
      type: "devotional",
      id: "devotional",
      title: "Devocional do dia",
      completed: spiritual.devotional.checklistComplete,
      xpReward: spiritual.devotional.xpReward,
    });
  }

  if (spiritual.readingPlan?.hasActivePlan) {
    addMission({
      key: "reading_plan:today",
      type: "reading_plan",
      id: "reading_plan",
      title: "Leitura planejada do dia",
      completed: spiritual.readingPlan.completedToday,
      xpReward: spiritual.readingPlan.xpReward,
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
