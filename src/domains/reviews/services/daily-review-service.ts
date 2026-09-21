import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapDailyReviewRow,
  type DailyReview,
  type DailyReviewRow,
  type DailyReviewSnapshot,
  type DailyReviewSnapshotRow,
} from "../types/daily-review";

export async function getDailyReviewSnapshot(
  supabase: SupabaseClient,
  date: string,
): Promise<DailyReviewSnapshot> {
  const { data, error } = await supabase
    .rpc("get_daily_review_snapshot", { p_date: date })
    .single<DailyReviewSnapshotRow>();

  if (error) throw new Error("Não foi possível calcular o resumo do dia.");
  return {
    tasksTotal: data!.tasks_total,
    tasksCompleted: data!.tasks_completed,
    xpEarned: data!.xp_earned,
  };
}

export async function getDailyReview(
  supabase: SupabaseClient,
  date: string,
): Promise<DailyReview | null> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .select("*")
    .eq("date", date)
    .maybeSingle<DailyReviewRow>();

  if (error) throw new Error("Não foi possível carregar a revisão do dia.");
  return data ? mapDailyReviewRow(data) : null;
}

export async function saveDailyReview(
  supabase: SupabaseClient,
  date: string,
  snapshot: DailyReviewSnapshot,
  carryOverNote: string | null,
): Promise<DailyReview> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .upsert(
      {
        date,
        tasks_total: snapshot.tasksTotal,
        tasks_completed: snapshot.tasksCompleted,
        xp_earned: snapshot.xpEarned,
        carry_over_note: carryOverNote,
      },
      { onConflict: "user_id,date" },
    )
    .select("*")
    .single<DailyReviewRow>();

  if (error) throw new Error("Não foi possível salvar a revisão do dia.");
  return mapDailyReviewRow(data!);
}
