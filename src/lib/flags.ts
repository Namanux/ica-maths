import { getSupabaseClient } from "./supabase";

const LOCAL_STORAGE_KEY = "icas-flags";

export interface QuestionFlag {
  id: string;
  paperId: string;
  paperTitle: string;
  questionId: string;
  questionNumber: number;
  profileSlug: string;
  note: string | null;
  createdAt: string;
}

interface FlagRow {
  id: string;
  paper_id: string;
  paper_title: string;
  question_id: string;
  question_number: number;
  profile_slug: string;
  note: string | null;
  created_at: string;
}

function rowToFlag(row: FlagRow): QuestionFlag {
  return {
    id: row.id,
    paperId: row.paper_id,
    paperTitle: row.paper_title,
    questionId: row.question_id,
    questionNumber: row.question_number,
    profileSlug: row.profile_slug,
    note: row.note,
    createdAt: row.created_at,
  };
}

function getLocalFlags(): QuestionFlag[] {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export async function reportIssue(flag: Omit<QuestionFlag, "id" | "createdAt">): Promise<void> {
  const entry: QuestionFlag = {
    ...flag,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = getLocalFlags();
    existing.unshift(entry);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // localStorage unavailable — ignore.
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("question_flags").insert({
      id: entry.id,
      paper_id: entry.paperId,
      paper_title: entry.paperTitle,
      question_id: entry.questionId,
      question_number: entry.questionNumber,
      profile_slug: entry.profileSlug,
      note: entry.note,
      created_at: entry.createdAt,
    });
  } catch {
    // Best-effort — don't block the exam on a network/DB error.
  }
}

export async function getAllFlags(): Promise<QuestionFlag[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getLocalFlags();

  try {
    const { data, error } = await supabase
      .from("question_flags")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return getLocalFlags();
    return (data as FlagRow[]).map(rowToFlag);
  } catch {
    return getLocalFlags();
  }
}

export async function dismissFlag(id: string): Promise<void> {
  try {
    const existing = getLocalFlags().filter((f) => f.id !== id);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable — ignore.
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("question_flags").delete().eq("id", id);
  } catch {
    // Best-effort.
  }
}
