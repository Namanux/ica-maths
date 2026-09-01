/**
 * Local (browser) history for ICAS-style Writing practice attempts.
 *
 * Mirrors the persistence approach used elsewhere in the app (localStorage,
 * keyed by profile slug). Each submission that gets AI-scored is appended as an
 * `WritingAttempt`; the detailed "Logs" report is attached to the same record
 * once it's generated.
 */

import type { WritingGenre } from "@/data/icas-writing-prompts";

export type ScoreKey =
  | "genreStructure"
  | "genreStyle"
  | "grammarTense"
  | "grammarCohesion"
  | "syntaxPunctuation";

export type WritingScores = Record<ScoreKey, number>;

export const SCORE_LABELS: Record<ScoreKey, string> = {
  genreStructure: "Genre — Structure & Purpose",
  genreStyle: "Genre — Style & Vocabulary",
  grammarTense: "Textual Grammar — Tense & Sentence Variety",
  grammarCohesion: "Textual Grammar — Cohesion (Pronouns/Connectives)",
  syntaxPunctuation: "Syntax & Punctuation",
};

export const SCORE_KEYS = Object.keys(SCORE_LABELS) as ScoreKey[];

export type AnnotationType =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "originality"
  | "strength"
  | "technique";

export interface Annotation {
  type: AnnotationType;
  quote: string;
  note: string;
}

export interface MiniLesson {
  title: string;
  rule: string;
  example?: string;
}

export interface TechniqueCheck {
  technique: string;
  used: boolean;
  note: string;
}

export interface DetailedReport {
  quickGuide?: string;
  annotations?: Annotation[];
  miniLessons?: MiniLesson[];
  techniqueChecklist?: TechniqueCheck[];
  sentenceStarters?: { repeated: string[]; note: string };
  modelRewrite?: { original: string; improved: string; why: string };
  sentenceVariety?: { simple: number; compound: number; complex: number; note: string };
  stretchTips?: string[];
  nextIdeas?: string[];
  aiRewrite?: { rewrite: string; changesSummary: string[] } | null;
}

export interface WritingAttempt {
  ts: number;
  dateLabel: string;
  taskType: WritingGenre;
  taskTitle: string;
  taskBody: string[];
  responseText: string;
  wordsAt35: number | null;
  finalWords: number;
  timeUsed: string;
  wpm: number;
  scores: WritingScores;
  strengths: string[];
  tips: string[];
  total: number;
  detailedReport: DetailedReport | null;
}

const KEY_PREFIX = "icas-writing-history-";

function keyFor(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

export function loadHistory(slug: string): WritingAttempt[] {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WritingAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(slug: string, attempts: WritingAttempt[]): void {
  try {
    localStorage.setItem(keyFor(slug), JSON.stringify(attempts));
  } catch {
    // Storage unavailable (private mode, quota) — the session still works.
  }
}

export function computeTotal(scores: Partial<WritingScores> | undefined): number {
  if (!scores) return 0;
  return SCORE_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
}

export function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(5, Math.round(v)));
}

/** Jaccard word-set similarity — detects when a submission is a revision. */
export function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection += 1;
  });
  const unionSize = new Set([...wordsA, ...wordsB]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

export function findPreviousAttempt(
  history: WritingAttempt[],
  currentText: string,
): WritingAttempt | null {
  if (!history.length) return null;
  const last = history[history.length - 1];
  if (!last.responseText) return null;
  return textSimilarity(currentText, last.responseText) >= 0.6 ? last : null;
}

export interface PersonalFocus {
  reportsCounted: number;
  mistakeFocus: AnnotationType[];
  rareTechniques: string[];
}

export function computePersonalFocus(history: WritingAttempt[]): PersonalFocus {
  const typeCounts: Record<string, number> = {
    spelling: 0,
    grammar: 0,
    punctuation: 0,
    technique: 0,
  };
  const techTotals: Record<string, { used: number; seen: number }> = {};
  let reportsCounted = 0;

  history.forEach((h) => {
    const dr = h.detailedReport;
    if (!dr) return;
    reportsCounted += 1;
    (dr.annotations ?? []).forEach((a) => {
      if (a.type in typeCounts) typeCounts[a.type] += 1;
    });
    (dr.techniqueChecklist ?? []).forEach((t) => {
      if (!techTotals[t.technique]) techTotals[t.technique] = { used: 0, seen: 0 };
      techTotals[t.technique].seen += 1;
      if (t.used) techTotals[t.technique].used += 1;
    });
  });

  const mistakeFocus = Object.keys(typeCounts)
    .filter((k) => typeCounts[k] > 0)
    .sort((a, b) => typeCounts[b] - typeCounts[a])
    .slice(0, 2) as AnnotationType[];

  const rareTechniques = Object.keys(techTotals)
    .map((name) => ({ name, rate: techTotals[name].used / techTotals[name].seen }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 2)
    .map((x) => x.name);

  return { reportsCounted, mistakeFocus, rareTechniques };
}

export function improvementStreak(history: WritingAttempt[], newTotal: number): number {
  const totals = history.map((h) => h.total).concat([newTotal]);
  let streak = 1;
  for (let i = totals.length - 1; i > 0; i -= 1) {
    if (totals[i] >= totals[i - 1]) streak += 1;
    else break;
  }
  return streak;
}
