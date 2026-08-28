import type { Paper, AttemptResult, QuestionResult, CategoryBreakdown } from "./types";

// Canonical display order for the ICAS strands. Papers may also use other
// category sets (e.g. the NSW Mathematics K–10 strands for Selective); those
// are ordered by first appearance in the paper / in a profile's attempts.
export const TOPIC_ORDER = [
  "Number & Arithmetic",
  "Algebra & Patterns",
  "Measures & Units",
  "Space & Geometry",
  "Chance & Data",
] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Distinct category labels across a set of scored attempts, ICAS strands first
 * (in canonical order), then any other labels in the order they first appear.
 * The category charts iterate this instead of a hard-coded list so non-ICAS
 * papers (Selective, …) chart their own strands.
 */
export function topicsFromAttempts(
  attempts: { categoryBreakdown: { topic: string }[] }[]
): string[] {
  const seen: string[] = [];
  for (const a of attempts) {
    for (const c of a.categoryBreakdown) {
      if (c.topic && !seen.includes(c.topic)) seen.push(c.topic);
    }
  }
  const canonical = (TOPIC_ORDER as readonly string[]).filter((t) => seen.includes(t));
  const rest = seen.filter((t) => !(TOPIC_ORDER as readonly string[]).includes(t));
  return [...canonical, ...rest];
}

export function isAnswerCorrect(userAnswer: string | null, question: Paper["questions"][number]): boolean {
  if (userAnswer === null) return false;
  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : [question.correctAnswer];
  return accepted.some((a) => normalize(a) === normalize(userAnswer));
}

export function scoreAttempt(
  paper: Paper,
  answers: Record<string, string | null>,
  timeTakenSeconds: number,
  questionTimeSpent?: Record<string, number>
): AttemptResult {
  const questionResults: QuestionResult[] = paper.questions.map((q) => {
    const userAnswer = answers[q.id] ?? null;
    const timeSpentSeconds = questionTimeSpent?.[q.id];
    return {
      questionId: q.id,
      questionNumber: q.number,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect: isAnswerCorrect(userAnswer, q),
      topic: q.topic,
      ...(timeSpentSeconds !== undefined ? { timeSpentSeconds: Math.round(timeSpentSeconds) } : {}),
    };
  });

  const score = questionResults.filter((r) => r.isCorrect).length;

  // Categories come from the paper's own question topics, in order of first
  // appearance — so each exam charts against its own strand set.
  const topicsInPaper: string[] = [];
  for (const q of paper.questions) {
    if (q.topic && !topicsInPaper.includes(q.topic)) topicsInPaper.push(q.topic);
  }

  const categoryBreakdown: CategoryBreakdown[] = topicsInPaper.map((topic) => {
    const inTopic = questionResults.filter((r) => r.topic === topic);
    const timed = inTopic.filter((r) => typeof r.timeSpentSeconds === "number");
    const avgTimeSeconds =
      timed.length > 0
        ? Math.round(timed.reduce((sum, r) => sum + (r.timeSpentSeconds ?? 0), 0) / timed.length)
        : undefined;
    return {
      topic,
      correct: inTopic.filter((r) => r.isCorrect).length,
      total: inTopic.length,
      ...(avgTimeSeconds !== undefined ? { avgTimeSeconds } : {}),
    };
  }).filter((c) => c.total > 0);

  return {
    id: crypto.randomUUID(),
    paperId: paper.id,
    score,
    totalQuestions: paper.questions.length,
    percentage: Math.round((score / paper.questions.length) * 100),
    timeTakenSeconds,
    questionResults,
    categoryBreakdown,
    completedAt: new Date().toISOString(),
  };
}
