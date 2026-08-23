import type { Paper, AttemptResult, QuestionResult, CategoryBreakdown } from "./types";

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

  const categoryBreakdown: CategoryBreakdown[] = TOPIC_ORDER.map((topic) => {
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
