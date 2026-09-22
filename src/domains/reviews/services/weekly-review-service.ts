import type { SupabaseClient } from "@supabase/supabase-js";

import { centsToDecimalString } from "@/shared/lib/money";

import type { WeeklyReviewAnswersInput } from "../schemas/weekly-review-schema";
import {
  mapWeeklyReviewRow,
  mapWeeklyReviewSnapshotRow,
  type WeeklyReview,
  type WeeklyReviewRow,
  type WeeklyReviewSnapshot,
  type WeeklyReviewSnapshotRow,
} from "../types/weekly-review";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function getWeeklyReviewSnapshot(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<WeeklyReviewSnapshot> {
  const { data, error } = await supabase
    .rpc("get_weekly_review_snapshot", { p_week_start: weekStart })
    .single<WeeklyReviewSnapshotRow>();

  if (error) throwFriendly("Não foi possível calcular o resumo da semana.");
  return mapWeeklyReviewSnapshotRow(data!);
}

export async function getWeeklyReview(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("week_start", weekStart)
    .maybeSingle<WeeklyReviewRow>();

  if (error) throwFriendly("Não foi possível carregar a revisão da semana.");
  return data ? mapWeeklyReviewRow(data) : null;
}

export async function saveWeeklyReview(
  supabase: SupabaseClient,
  weekStart: string,
  snapshot: WeeklyReviewSnapshot,
  answers: WeeklyReviewAnswersInput,
): Promise<WeeklyReview> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        week_start: weekStart,
        xp_earned: snapshot.xpEarned,
        tasks_completed: snapshot.tasksCompleted,
        tasks_total: snapshot.tasksTotal,
        habits_completed: snapshot.habitsCompleted,
        workouts_completed: snapshot.workoutsCompleted,
        meals_adherent: snapshot.mealsAdherent,
        meals_planned: snapshot.mealsPlanned,
        water_goal_days: snapshot.waterGoalDays,
        devotional_days: snapshot.devotionalDays,
        bible_reading_days: snapshot.bibleReadingDays,
        weight_logs_count: snapshot.weightLogsCount,
        personal_expenses: centsToDecimalString(snapshot.personalExpensesCents),
        sales_revenue: centsToDecimalString(snapshot.salesRevenueCents),
        sales_profit: centsToDecimalString(snapshot.salesProfitCents),
        leads_count: snapshot.leadsCount,
        what_worked: answers.whatWorked || null,
        what_didnt_work: answers.whatDidntWork || null,
        improvement: answers.improvement || null,
        next_week_priority: answers.nextWeekPriority || null,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single<WeeklyReviewRow>();

  if (error) throwFriendly("Não foi possível salvar a revisão da semana.");
  return mapWeeklyReviewRow(data!);
}
