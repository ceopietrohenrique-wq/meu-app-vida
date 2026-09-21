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
  weightLogs: ["weight-logs"] as const,
  weightGoal: ["weight-goal"] as const,
  measurements: ["measurements"] as const,
  bmiRecords: ["bmi-records"] as const,
  waterToday: ["water-today"] as const,
  waterSettings: ["water-settings"] as const,
  walkLogs: ["walk-logs"] as const,
  healthXpSummary: ["health-xp-summary"] as const,
  mealPlans: ["meal-plans"] as const,
  workoutPlans: ["workout-plans"] as const,
  workoutSessions: ["workout-sessions"] as const,
  devotionals: ["devotionals"] as const,
  bibleStudyNotes: ["bible-study-notes"] as const,
  readingPlans: ["reading-plans"] as const,
  prayers: ["prayers"] as const,
  savedVerses: ["saved-verses"] as const,
  spiritualXpSummary: ["spiritual-xp-summary"] as const,
  spiritualSearch: ["spiritual-search"] as const,
};
