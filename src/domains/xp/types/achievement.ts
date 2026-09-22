export const ACHIEVEMENT_DEFINITIONS = {
  primeira_tarefa: {
    title: "Primeiro passo",
    description: "Concluiu a primeira tarefa.",
  },
  dez_tarefas: {
    title: "Produtivo",
    description: "Concluiu 10 tarefas.",
  },
  primeiro_habito: {
    title: "Constância",
    description: "Registrou o primeiro hábito.",
  },
  sete_devocionais: {
    title: "Fiel",
    description: "Completou o devocional em 7 dias.",
  },
  primeiro_treino: {
    title: "Em movimento",
    description: "Concluiu o primeiro treino.",
  },
  primeira_venda: {
    title: "Empreendedor",
    description: "Fechou a primeira venda.",
  },
  meta_trimestral_concluida: {
    title: "Visão de longo prazo",
    description: "Concluiu uma meta trimestral.",
  },
  mil_xp: {
    title: "Mil pontos",
    description: "Alcançou 1.000 XP no total.",
  },
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENT_DEFINITIONS;

export type UnlockedAchievement = {
  id: string;
  achievementKey: AchievementKey;
  unlockedAt: string;
};

export type UserAchievementRow = {
  id: string;
  achievement_key: AchievementKey;
  unlocked_at: string;
};

export function mapUserAchievementRow(
  row: UserAchievementRow,
): UnlockedAchievement {
  return {
    id: row.id,
    achievementKey: row.achievement_key,
    unlockedAt: row.unlocked_at,
  };
}
