/**
 * Chaves de cache do TanStack Query que precisam ser invalidadas por mais
 * de um domínio (ex.: concluir uma tarefa também muda o resumo de XP e pode
 * gerar uma notificação). Chaves usadas só dentro do próprio domínio ficam
 * lá, não aqui.
 */
export const QUERY_KEYS = {
  tasks: ["tasks"] as const,
  habits: ["habits"] as const,
  xpSummary: ["xp-summary"] as const,
  notifications: ["notifications"] as const,
  inbox: ["inbox"] as const,
  weeklyPlan: ["weekly-plan"] as const,
  dailyReview: ["daily-review"] as const,
};
