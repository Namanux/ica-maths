import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import type { AttemptResult } from "./types";

const LOCAL_STORAGE_KEY = "icas-attempts";

export interface StoredAttempt extends AttemptResult {
  paperTitle: string;
}

interface AttemptRow {
  id: string;
  paper_id: string;
  paper_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken_seconds: number;
  question_results: AttemptResult["questionResults"];
  category_breakdown: AttemptResult["categoryBreakdown"];
  completed_at: string;
}

function rowToAttempt(row: AttemptRow): StoredAttempt {
  return {
    id: row.id,
    paperId: row.paper_id,
    paperTitle: row.paper_title,
    score: row.score,
    totalQuestions: row.total_questions,
    percentage: row.percentage,
    timeTakenSeconds: row.time_taken_seconds,
    questionResults: row.question_results,
    categoryBreakdown: row.category_breakdown ?? [],
    completedAt: row.completed_at,
  };
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
      id: attempt.id,
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

/**
 * Attempts made on any device show up here when Supabase is configured —
 * that's the shared, cross-device list. Falls back to this browser's own
 * local history otherwise.
 */
export async function getAttempts(): Promise<StoredAttempt[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getLocalAttempts();

  try {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error || !data) return getLocalAttempts();
    return (data as AttemptRow[]).map(rowToAttempt);
  } catch {
    return getLocalAttempts();
  }
}

export async function getAttemptById(id: string): Promise<StoredAttempt | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("attempts").select("*").eq("id", id).single();
      if (!error && data) return rowToAttempt(data as AttemptRow);
    } catch {
      // fall through to local lookup
    }
  }
  return getLocalAttempts().find((a) => a.id === id) ?? null;
}

export async function deleteAttempt(id: string): Promise<void> {
  try {
    const existing = getLocalAttempts().filter((a) => a.id !== id);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — ignore.
  }

  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("attempts").delete().eq("id", id);
  } catch {
    // Best-effort.
  }
}
