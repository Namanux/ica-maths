import { getSupabaseClient } from "@/lib/supabase";
import { getContentBlockName, type ProgressionResult } from "@/lib/abacus/progressionEngine";

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
  speedSeconds: number;
  contentBlock: number;
};

export type AbacusProgress = {
  profileSlug: string;
  totalXp: number;
  currentLevel: number;
  highestLessonUnlocked: number;
  contentBlock: number;
  speedSeconds: number;
  displayLevel: number;
  accuracyThreshold: number;
  questionsPerSession: number;
  totalSessions: number;
};

interface AbacusProgressRow {
  profile_slug: string;
  total_xp: number;
  current_level: number;
  highest_lesson_unlocked: number;
  content_block: number;
  speed_seconds: number;
  display_level: number;
  accuracy_threshold: number;
  questions_per_session: number;
  total_sessions: number;
  updated_at: string;
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
      speed_seconds: session.speedSeconds,
      content_block: session.contentBlock,
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
      contentBlock: row.content_block ?? 1,
      speedSeconds: row.speed_seconds ?? 15,
      displayLevel: row.display_level ?? 1,
      accuracyThreshold: row.accuracy_threshold ?? 100,
      questionsPerSession: row.questions_per_session ?? 5,
      totalSessions: row.total_sessions ?? 0,
    };
  } catch {
    return null;
  }
}

// Sole writer of progression position + XP/session counters going forward.
// Level unlocking on the curriculum home page reads content_block directly
// (see isLevelUnlocked in curriculum.ts) rather than the older
// highest_lesson_unlocked column, so this doesn't need to touch that field.
export async function saveProgressionResult(
  studentId: string,
  result: ProgressionResult,
  xpEarned: number
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data } = await supabase
      .from("abacus_progress")
      .select("total_xp, total_sessions")
      .eq("profile_slug", studentId)
      .single();

    const row = data as Pick<AbacusProgressRow, "total_xp" | "total_sessions"> | null;

    await supabase.from("abacus_progress").upsert(
      {
        profile_slug: studentId,
        content_block: result.newContentBlock,
        speed_seconds: result.newSpeedSeconds,
        display_level: result.newDisplayLevel,
        total_xp: (row?.total_xp ?? 0) + xpEarned,
        total_sessions: (row?.total_sessions ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_slug" }
    );
  } catch (error) {
    console.error("saveProgressionResult failed", error);
  }
}

export type AbacusStudent = {
  studentId: string;
  displayName: string;
  contentBlock: number;
  contentBlockName: string;
  speedSeconds: number;
  displayLevel: number;
  totalXp: number;
  totalSessions: number;
  lastSessionAt: string | null;
};

interface AbacusStudentRow {
  student_id: string;
  display_name: string;
  is_active: boolean;
}

export async function getAllStudents(): Promise<AbacusStudent[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const [{ data: students, error: studentsError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase.from("abacus_students").select("*").eq("is_active", true),
        supabase.from("abacus_progress").select("*"),
      ]);
    if (studentsError || !students) return [];

    const progressBySlug = new Map(
      ((progress as AbacusProgressRow[] | null) ?? []).map((row) => [row.profile_slug, row])
    );
    if (progressError) console.error("getAllStudents progress lookup failed", progressError);

    return (students as AbacusStudentRow[]).map((student) => {
      const row = progressBySlug.get(student.student_id);
      return {
        studentId: student.student_id,
        displayName: student.display_name,
        contentBlock: row?.content_block ?? 1,
        contentBlockName: getContentBlockName(row?.content_block ?? 1),
        speedSeconds: row?.speed_seconds ?? 15,
        displayLevel: row?.display_level ?? 1,
        totalXp: row?.total_xp ?? 0,
        totalSessions: row?.total_sessions ?? 0,
        lastSessionAt: row?.total_sessions ? row.updated_at : null,
      };
    });
  } catch (error) {
    console.error("getAllStudents failed", error);
    return [];
  }
}

export type AbacusSession = {
  id: string;
  sessionNumber: number;
  contentBlock: number;
  contentBlockName: string;
  speedSeconds: number;
  questionsTotal: number;
  questionsCorrect: number;
  accuracy: number;
  avgResponseTimeMs: number;
  xpEarned: number;
  completedAt: string;
};

interface AbacusSessionRow {
  id: string;
  content_block: number | null;
  speed_seconds: number | null;
  questions_total: number;
  questions_correct: number;
  accuracy: number;
  avg_response_time_ms: number | null;
  xp_earned: number;
  completed_at: string;
}

export async function getStudentSessions(
  studentId: string,
  limit: number
): Promise<AbacusSession[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("abacus_sessions")
      .select("*")
      .eq("profile_slug", studentId)
      .order("completed_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];

    const rows = data as AbacusSessionRow[];
    return rows.map((row, i) => ({
      id: row.id,
      sessionNumber: rows.length - i,
      contentBlock: row.content_block ?? 1,
      contentBlockName: getContentBlockName(row.content_block ?? 1),
      speedSeconds: row.speed_seconds ?? 15,
      questionsTotal: row.questions_total,
      questionsCorrect: row.questions_correct,
      accuracy: row.accuracy,
      avgResponseTimeMs: row.avg_response_time_ms ?? 0,
      xpEarned: row.xp_earned,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    console.error("getStudentSessions failed", error);
    return [];
  }
}

export async function updateStudentSettings(
  studentId: string,
  settings: {
    contentBlock?: number;
    speedSeconds?: number;
    questionsPerSession?: number;
    accuracyThreshold?: number;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload: Record<string, number | string> = { profile_slug: studentId };
  if (settings.contentBlock !== undefined) payload.content_block = settings.contentBlock;
  if (settings.speedSeconds !== undefined) payload.speed_seconds = settings.speedSeconds;
  if (settings.questionsPerSession !== undefined)
    payload.questions_per_session = settings.questionsPerSession;
  if (settings.accuracyThreshold !== undefined)
    payload.accuracy_threshold = settings.accuracyThreshold;

  try {
    await supabase.from("abacus_progress").upsert(payload, { onConflict: "profile_slug" });
  } catch (error) {
    console.error("updateStudentSettings failed", error);
  }
}
