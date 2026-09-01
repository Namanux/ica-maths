import type { DetailedReport, WritingScores } from "@/lib/icas-writing-history";
import type { WritingGenre } from "@/data/icas-writing-prompts";

export interface ScoreResult {
  scores: WritingScores;
  strengths: string[];
  tips: string[];
}

export interface RewriteResult {
  rewrite: string;
  changesSummary: string[];
}

interface BaseArgs {
  taskType: WritingGenre;
  taskTitle: string;
  responseText: string;
  isRevision?: boolean;
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/writing-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as
    | { result?: T; error?: string }
    | null;
  if (!res.ok || !data || data.result === undefined) {
    throw new Error(data?.error || "Couldn't get AI feedback right now.");
  }
  return data.result;
}

export function requestScore(
  args: BaseArgs & { wordCount: number; timeUsed?: string; previousTotal?: number | null },
): Promise<ScoreResult> {
  return call<ScoreResult>({ mode: "score", ...args });
}

export function requestDetail(args: BaseArgs): Promise<DetailedReport> {
  return call<DetailedReport>({ mode: "detail", ...args });
}

export function requestRewrite(args: BaseArgs): Promise<RewriteResult> {
  return call<RewriteResult>({ mode: "rewrite", ...args });
}
