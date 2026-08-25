import { getSupabaseClient } from "@/lib/supabase";

export type AbacusSessionResult = {
  profileSlug: string;
  level: number;
  lesson: number;
  score: number;
  accuracy: number;
  xpEarned: number;
  avgResponseTimeMs: number;
  questionsTotal: number;
  questionsCorrect: number;
};

export type AbacusProgress = {
  profileSlug: string;
  totalXp: number;
  currentLevel: number;
  highestLessonUnlocked: number;
};

interface AbacusProgressRow {
  profile_slug: string;
  total_xp: number;
  current_level: number;
  highest_lesson_unlocked: number;
}

export async function saveSession(session: AbacusSessionResult): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("abacus_sessions").insert({
      profile_slug: session.profileSlug,
      level: session.level,
      lesson: session.lesson,
      score: session.score,
      accuracy: session.accuracy,
      xp_earned: session.xpEarned,
      avg_response_time_ms: Math.round(session.avgResponseTimeMs),
      questions_total: session.questionsTotal,
      questions_correct: session.questionsCorrect,
    });
  } catch {
    // Best-effort — don't block the results screen on a network/DB error.
  }
}

export async function updateStudentXp(
  profileSlug: string,
  xpEarned: number,
  lessonCompleted: number,
  accuracy: number
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const current = await getStudentProgress(profileSlug);
    const totalXp = (current?.totalXp ?? 0) + xpEarned;
    const highestLessonUnlocked =
      accuracy >= 80
        ? Math.max(current?.highestLessonUnlocked ?? 1, lessonCompleted + 1)
        : current?.highestLessonUnlocked ?? 1;

    await supabase.from("abacus_progress").upsert(
      {
        profile_slug: profileSlug,
        total_xp: totalXp,
        current_level: current?.currentLevel ?? 1,
        highest_lesson_unlocked: highestLessonUnlocked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_slug" }
    );
  } catch {
    // Best-effort — don't block the results screen on a network/DB error.
  }
}

export async function getStudentProgress(profileSlug: string): Promise<AbacusProgress | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("abacus_progress")
      .select("*")
      .eq("profile_slug", profileSlug)
      .single();
    if (error || !data) return null;

    const row = data as AbacusProgressRow;
    return {
      profileSlug: row.profile_slug,
      totalXp: row.total_xp,
      currentLevel: row.current_level,
      highestLessonUnlocked: row.highest_lesson_unlocked,
    };
  } catch {
    return null;
  }
}
