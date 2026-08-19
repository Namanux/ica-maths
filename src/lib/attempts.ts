import { getSupabaseClient } from "./supabase";
import type { AttemptResult } from "./types";

const LOCAL_STORAGE_KEY = "icas-attempts";

export interface StoredAttempt extends AttemptResult {
  paperTitle: string;
}

export async function saveAttempt(attempt: StoredAttempt): Promise<void> {
  // Always keep a local copy so results work even without Supabase configured.
  try {
    const existing: StoredAttempt[] = JSON.parse(
      window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]"
    );
    existing.unshift(attempt);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch {
    // localStorage unavailable — ignore.
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("attempts").insert({
      paper_id: attempt.paperId,
      paper_title: attempt.paperTitle,
      score: attempt.score,
      total_questions: attempt.totalQuestions,
      percentage: attempt.percentage,
      time_taken_seconds: attempt.timeTakenSeconds,
      question_results: attempt.questionResults,
      category_breakdown: attempt.categoryBreakdown,
      completed_at: attempt.completedAt,
    });
  } catch {
    // Best-effort — don't block the results screen on a network/DB error.
  }
}

export function getLocalAttempts(): StoredAttempt[] {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
