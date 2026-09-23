export type NotificationPreferences = {
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  tasksEnabled: boolean;
  waterEnabled: boolean;
  dietEnabled: boolean;
  workoutEnabled: boolean;
  weightEnabled: boolean;
  spiritualEnabled: boolean;
  financeEnabled: boolean;
  businessEnabled: boolean;
  dailySummaryEnabled: boolean;
  weeklySummaryEnabled: boolean;
  dailySummaryTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type NotificationPreferencesRow = {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  tasks_enabled: boolean;
  water_enabled: boolean;
  diet_enabled: boolean;
  workout_enabled: boolean;
  weight_enabled: boolean;
  spiritual_enabled: boolean;
  finance_enabled: boolean;
  business_enabled: boolean;
  daily_summary_enabled: boolean;
  weekly_summary_enabled: boolean;
  daily_summary_time: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
};

export function mapNotificationPreferencesRow(
  row: NotificationPreferencesRow,
): NotificationPreferences {
  return {
    userId: row.user_id,
    inAppEnabled: row.in_app_enabled,
    pushEnabled: row.push_enabled,
    tasksEnabled: row.tasks_enabled,
    waterEnabled: row.water_enabled,
    dietEnabled: row.diet_enabled,
    workoutEnabled: row.workout_enabled,
    weightEnabled: row.weight_enabled,
    spiritualEnabled: row.spiritual_enabled,
    financeEnabled: row.finance_enabled,
    businessEnabled: row.business_enabled,
    dailySummaryEnabled: row.daily_summary_enabled,
    weeklySummaryEnabled: row.weekly_summary_enabled,
    dailySummaryTime: row.daily_summary_time.slice(0, 5),
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start.slice(0, 5),
    quietHoursEnd: row.quiet_hours_end.slice(0, 5),
  };
}

export const NOTIFICATION_PRESETS = {
  essencial: {
    tasksEnabled: true,
    waterEnabled: false,
    dietEnabled: false,
    workoutEnabled: false,
    weightEnabled: false,
    spiritualEnabled: false,
    financeEnabled: true,
    businessEnabled: true,
    dailySummaryEnabled: false,
    weeklySummaryEnabled: true,
  },
  equilibrado: {
    tasksEnabled: true,
    waterEnabled: true,
    dietEnabled: true,
    workoutEnabled: true,
    weightEnabled: false,
    spiritualEnabled: true,
    financeEnabled: true,
    businessEnabled: true,
    dailySummaryEnabled: true,
    weeklySummaryEnabled: true,
  },
  intenso: {
    tasksEnabled: true,
    waterEnabled: true,
    dietEnabled: true,
    workoutEnabled: true,
    weightEnabled: true,
    spiritualEnabled: true,
    financeEnabled: true,
    businessEnabled: true,
    dailySummaryEnabled: true,
    weeklySummaryEnabled: true,
  },
} as const;

export type NotificationPresetKey = keyof typeof NOTIFICATION_PRESETS;
