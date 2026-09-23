import type { SupabaseClient } from "@supabase/supabase-js";

import type { UpdateNotificationPreferencesInput } from "../schemas/notification-preferences-schema";
import {
  mapNotificationPreferencesRow,
  type NotificationPreferences,
  type NotificationPreferencesRow,
} from "../types/notification-preferences";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .single<NotificationPreferencesRow>();

  if (error) throwFriendly("Não foi possível carregar as preferências.");
  return mapNotificationPreferencesRow(data!);
}

export async function updateNotificationPreferences(
  supabase: SupabaseClient,
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throwFriendly("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("notification_preferences")
    .update({
      in_app_enabled: input.inAppEnabled,
      push_enabled: input.pushEnabled,
      tasks_enabled: input.tasksEnabled,
      water_enabled: input.waterEnabled,
      diet_enabled: input.dietEnabled,
      workout_enabled: input.workoutEnabled,
      weight_enabled: input.weightEnabled,
      spiritual_enabled: input.spiritualEnabled,
      finance_enabled: input.financeEnabled,
      business_enabled: input.businessEnabled,
      daily_summary_enabled: input.dailySummaryEnabled,
      weekly_summary_enabled: input.weeklySummaryEnabled,
      daily_summary_time: input.dailySummaryTime,
      quiet_hours_enabled: input.quietHoursEnabled,
      quiet_hours_start: input.quietHoursStart,
      quiet_hours_end: input.quietHoursEnd,
    })
    .eq("user_id", user.id)
    .select("*")
    .single<NotificationPreferencesRow>();

  if (error) throwFriendly("Não foi possível salvar as preferências.");
  return mapNotificationPreferencesRow(data!);
}
