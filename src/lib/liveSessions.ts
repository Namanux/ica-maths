import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export interface LiveSessionState {
  profileSlug: string;
  profileName: string;
  section?: string | null;
  pageLabel?: string | null;
  paperId?: string | null;
  paperTitle?: string | null;
  questionNumber?: number | null;
  totalQuestions?: number | null;
  answers?: Record<string, string | null> | null;
  lastAnswerLabel?: string | null;
  lastAnswerCorrect?: boolean | null;
  examStatus?: "intro" | "in_progress" | "finished" | null;
  secondsLeft?: number | null;
  hoveredItem?: string | null;
}

interface LiveSessionRow {
  profile_slug: string;
  profile_name: string;
  section: string | null;
  page_label: string | null;
  paper_id: string | null;
  paper_title: string | null;
  question_number: number | null;
  total_questions: number | null;
  answers: Record<string, string | null> | null;
  last_answer_label: string | null;
  last_answer_correct: boolean | null;
  exam_status: string | null;
  seconds_left: number | null;
  hovered_item: string | null;
  updated_at: string;
}

export interface LiveSession {
  profileSlug: string;
  profileName: string;
  section: string | null;
  pageLabel: string | null;
  paperId: string | null;
  paperTitle: string | null;
  questionNumber: number | null;
  totalQuestions: number | null;
  answers: Record<string, string | null> | null;
  lastAnswerLabel: string | null;
  lastAnswerCorrect: boolean | null;
  examStatus: "intro" | "in_progress" | "finished" | null;
  secondsLeft: number | null;
  hoveredItem: string | null;
  updatedAt: string;
}

function rowToSession(row: LiveSessionRow): LiveSession {
  return {
    profileSlug: row.profile_slug,
    profileName: row.profile_name,
    section: row.section,
    pageLabel: row.page_label,
    paperId: row.paper_id,
    paperTitle: row.paper_title,
    questionNumber: row.question_number,
    totalQuestions: row.total_questions,
    answers: row.answers,
    lastAnswerLabel: row.last_answer_label,
    lastAnswerCorrect: row.last_answer_correct,
    examStatus: (row.exam_status as LiveSession["examStatus"]) ?? null,
    secondsLeft: row.seconds_left,
    hoveredItem: row.hovered_item,
    updatedAt: row.updated_at,
  };
}

/** Best-effort — never throws, silently no-ops when Supabase isn't configured. */
export async function reportLiveState(state: LiveSessionState): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const payload: Record<string, unknown> = {
    profile_slug: state.profileSlug,
    profile_name: state.profileName,
    updated_at: new Date().toISOString(),
  };
  if (state.section !== undefined) payload.section = state.section;
  if (state.pageLabel !== undefined) payload.page_label = state.pageLabel;
  if (state.paperId !== undefined) payload.paper_id = state.paperId;
  if (state.paperTitle !== undefined) payload.paper_title = state.paperTitle;
  if (state.questionNumber !== undefined) payload.question_number = state.questionNumber;
  if (state.totalQuestions !== undefined) payload.total_questions = state.totalQuestions;
  if (state.answers !== undefined) payload.answers = state.answers;
  if (state.lastAnswerLabel !== undefined) payload.last_answer_label = state.lastAnswerLabel;
  if (state.lastAnswerCorrect !== undefined) payload.last_answer_correct = state.lastAnswerCorrect;
  if (state.examStatus !== undefined) payload.exam_status = state.examStatus;
  if (state.secondsLeft !== undefined) payload.seconds_left = state.secondsLeft;
  if (state.hoveredItem !== undefined) payload.hovered_item = state.hoveredItem;

  try {
    await supabase.from("live_sessions").upsert(payload, { onConflict: "profile_slug" });
  } catch {
    // Best-effort — don't let a flaky connection interrupt studying.
  }
}

/**
 * Subscribes to every live_sessions row in real time. Calls `onChange` with
 * the full current list on the initial load and after every insert/update/
 * delete. Returns an unsubscribe function.
 */
export function subscribeLiveSessions(
  onChange: (sessions: LiveSession[]) => void
): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const sessions = new Map<string, LiveSession>();
  const emit = () => onChange(Array.from(sessions.values()));

  supabase
    .from("live_sessions")
    .select("*")
    .then(({ data }) => {
      if (data) {
        for (const row of data as LiveSessionRow[]) {
          sessions.set(row.profile_slug, rowToSession(row));
        }
        emit();
      }
    });

  const channel = supabase
    .channel("live_sessions_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_sessions" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as Partial<LiveSessionRow>;
          if (oldRow.profile_slug) sessions.delete(oldRow.profile_slug);
        } else {
          const row = payload.new as LiveSessionRow;
          sessions.set(row.profile_slug, rowToSession(row));
        }
        emit();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
