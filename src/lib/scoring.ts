import type { Paper, AttemptResult, QuestionResult } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isAnswerCorrect(userAnswer: string | null, question: Paper["questions"][number]): boolean {
  if (userAnswer === null) return false;
  const accepted = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : [question.correctAnswer];
  return accepted.some((a) => normalize(a) === normalize(userAnswer));
}

export function scoreAttempt(
  paper: Paper,
  answers: Record<string, string | null>,
  timeTakenSeconds: number
): AttemptResult {
  const questionResults: QuestionResult[] = paper.questions.map((q) => {
    const userAnswer = answers[q.id] ?? null;
    return {
      questionId: q.id,
      questionNumber: q.number,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect: isAnswerCorrect(userAnswer, q),
    };
  });

  const score = questionResults.filter((r) => r.isCorrect).length;

  return {
    paperId: paper.id,
    score,
    totalQuestions: paper.questions.length,
    percentage: Math.round((score / paper.questions.length) * 100),
    timeTakenSeconds,
    questionResults,
    completedAt: new Date().toISOString(),
  };
}
