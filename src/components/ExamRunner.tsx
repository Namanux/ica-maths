"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Paper, AttemptResult, QuestionResult } from "@/lib/types";
import { scoreAttempt } from "@/lib/scoring";
import { saveAttempt } from "@/lib/attempts";
import { QuestionBody } from "@/components/QuestionBody";
import { TopicBadge } from "@/components/TopicBadge";
import Link from "next/link";

type Status = "intro" | "in_progress" | "finished";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamRunner({ paper }: { paper: Paper }) {
  const [status, setStatus] = useState<Status>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [secondsLeft, setSecondsLeft] = useState(paper.timeLimitMinutes * 60);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const finishExam = useCallback(() => {
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : paper.timeLimitMinutes * 60 - secondsLeft;
    const attempt = scoreAttempt(paper, answers, elapsed);
    setResult(attempt);
    setStatus("finished");
    setReviewIndex(null);
    void saveAttempt({ ...attempt, paperTitle: paper.title });
  }, [answers, paper, secondsLeft]);

  useEffect(() => {
    if (status !== "in_progress") return;
    if (secondsLeft <= 0) {
      finishExam();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft, finishExam]);

  const startExam = () => {
    startTimeRef.current = Date.now();
    setStatus("in_progress");
  };

  const resetAll = () => {
    setAnswers({});
    setSecondsLeft(paper.timeLimitMinutes * 60);
    setResult(null);
    setReviewIndex(null);
    setCurrentIndex(0);
    setStatus("intro");
  };

  const currentQuestion = paper.questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v !== null && v !== undefined).length,
    [answers]
  );

  const selectAnswer = (label: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));
  };

  const enterFreeResponse = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  if (status === "intro") {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{paper.title}</h1>
          <p className="text-muted mt-1">
            {paper.questions.length} questions · {paper.timeLimitMinutes} minutes ·
            Year {paper.yearLevel}
          </p>
        </div>
        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>Your score is the number of correct answers — no penalty for wrong answers.</li>
          <li>You can move between questions freely and change your answers before submitting.</li>
          <li>The exam auto-submits when the timer reaches zero.</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={startExam}
            className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
          >
            Start exam
          </button>
          <Link
            href="/"
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (status === "finished" && result) {
    if (reviewIndex !== null) {
      return (
        <ReviewQuestionView
          paper={paper}
          result={result}
          index={reviewIndex}
          onNavigate={setReviewIndex}
          onBackToResults={() => setReviewIndex(null)}
        />
      );
    }
    return (
      <ResultsView
        paper={paper}
        result={result}
        onOpenQuestion={(i) => setReviewIndex(i)}
        onResetAll={resetAll}
      />
    );
  }

  const userAnswer = answers[currentQuestion.id] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          Question {currentQuestion.number} of {paper.questions.length} · {answeredCount} answered
        </div>
        <div
          className={`text-sm font-mono rounded-full px-3 py-1 border ${
            secondsLeft <= 60 ? "border-incorrect text-incorrect" : "border-border"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {paper.questions.map((q, i) => {
          const answered = answers[q.id] !== undefined && answers[q.id] !== null;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-8 w-8 text-xs rounded border flex items-center justify-center transition-colors ${
                isCurrent
                  ? "border-accent bg-accent text-background"
                  : answered
                  ? "border-border bg-surface"
                  : "border-border"
              }`}
            >
              {q.number}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border p-5 flex flex-col gap-4">
        <QuestionBody question={currentQuestion} />

        {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
          <div className="flex flex-col gap-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => selectAnswer(opt.label)}
                className={`flex items-center gap-3 text-left rounded-lg border px-4 py-3 transition-colors ${
                  userAnswer === opt.label
                    ? "border-accent bg-surface"
                    : "border-border hover:bg-surface"
                }`}
              >
                <span className="font-mono font-medium">{opt.label}</span>
                {opt.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.imageUrl}
                    alt={`Option ${opt.label}`}
                    className="question-image h-16"
                  />
                ) : (
                  <span>{opt.text}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === "free_response" && (
          <input
            type="text"
            value={userAnswer ?? ""}
            onChange={(e) => enterFreeResponse(e.target.value)}
            placeholder="Enter your answer"
            className="rounded-lg border border-border px-4 py-2.5 bg-background"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        {currentIndex === paper.questions.length - 1 ? (
          <button
            onClick={finishExam}
            className="rounded-full bg-accent text-background px-5 py-2 font-medium hover:opacity-90"
          >
            Submit exam
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(paper.questions.length - 1, i + 1))}
            className="rounded-full border border-border px-4 py-2"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function questionStatusColor(qr: QuestionResult | undefined): {
  bg: string;
  border: string;
  text: string;
} {
  if (!qr || qr.userAnswer === null || qr.userAnswer === undefined) {
    return { bg: "transparent", border: "var(--border)", text: "var(--foreground)" };
  }
  if (qr.isCorrect) {
    return { bg: "var(--correct)", border: "var(--correct)", text: "var(--background)" };
  }
  return { bg: "var(--incorrect)", border: "var(--incorrect)", text: "var(--background)" };
}

function QuestionMap({
  paper,
  result,
  onOpenQuestion,
}: {
  paper: Paper;
  result: AttemptResult;
  onOpenQuestion: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
      {paper.questions.map((q, i) => {
        const qr = result.questionResults.find((r) => r.questionId === q.id);
        const colors = questionStatusColor(qr);
        return (
          <button
            key={q.id}
            onClick={() => onOpenQuestion(i)}
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.bg === "transparent" ? "var(--foreground)" : colors.text,
            }}
            className="h-10 rounded-md border text-sm font-medium flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            {q.number}
          </button>
        );
      })}
    </div>
  );
}

function ResultsView({
  paper,
  result,
  onOpenQuestion,
  onResetAll,
}: {
  paper: Paper;
  result: AttemptResult;
  onOpenQuestion: (i: number) => void;
  onResetAll: () => void;
}) {
  const wrong = result.questionResults.filter(
    (r) => !r.isCorrect && r.userAnswer !== null && r.userAnswer !== undefined
  ).length;
  const unanswered = result.totalQuestions - result.score - wrong;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - result.percentage / 100);

  return (
    <div className="flex flex-col gap-8 print-results">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <Link
          href="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
        >
          ← Back to papers
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Results</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={() => {
              if (window.confirm("Reset this attempt and start over?")) onResetAll();
            }}
            className="rounded-full border border-incorrect text-incorrect px-4 py-2 text-sm font-medium hover:bg-incorrect/10 transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="text-center print-only-block hidden">
        <h1 className="text-xl font-semibold">{paper.title} — Results</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative h-[180px] w-[180px]">
          <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="var(--correct)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: "var(--correct)" }}>
              {result.percentage}%
            </span>
            <span className="text-sm text-muted mt-1">
              {result.score}/{result.totalQuestions} correct
            </span>
          </div>
        </div>
        <div className="text-sm text-muted">
          Time taken: {formatTime(result.timeTakenSeconds)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-surface border border-border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--correct)" }}>
            {result.score}
          </div>
          <div className="text-xs text-muted tracking-wide uppercase mt-1">Correct</div>
        </div>
        <div className="rounded-lg bg-surface border border-border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--incorrect)" }}>
            {wrong}
          </div>
          <div className="text-xs text-muted tracking-wide uppercase mt-1">Wrong</div>
        </div>
        <div className="rounded-lg bg-surface border border-border p-4 text-center">
          <div className="text-2xl font-bold">{unanswered}</div>
          <div className="text-xs text-muted tracking-wide uppercase mt-1">Unanswered</div>
        </div>
      </div>

      {result.categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted">
            By Category
          </h2>
          <div className="flex flex-col gap-3">
            {result.categoryBreakdown.map((c) => {
              const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
              return (
                <div key={c.topic} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <TopicBadge topic={c.topic} />
                    <span className="text-sm text-muted">
                      {c.correct}/{c.total} correct
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--correct)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wide uppercase text-muted">
          Question Map
        </h2>
        <p className="text-xs text-muted -mt-2 no-print">
          Click a number to jump straight to that question.
        </p>
        <QuestionMap paper={paper} result={result} onOpenQuestion={onOpenQuestion} />
        <div className="flex gap-4 text-xs text-muted mt-1 no-print">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: "var(--correct)" }}
            />
            Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: "var(--incorrect)" }}
            />
            Wrong
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-border" />
            Unanswered
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewQuestionView({
  paper,
  result,
  index,
  onNavigate,
  onBackToResults,
}: {
  paper: Paper;
  result: AttemptResult;
  index: number;
  onNavigate: (i: number) => void;
  onBackToResults: () => void;
}) {
  const question = paper.questions[index];
  const qr = result.questionResults.find((r) => r.questionId === question.id)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToResults}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
        >
          ← Back to results
        </button>
        <div className="text-sm text-muted">
          Question {question.number} of {paper.questions.length}
        </div>
      </div>

      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
        {paper.questions.map((q, i) => {
          const r = result.questionResults.find((res) => res.questionId === q.id);
          const colors = questionStatusColor(r);
          const isCurrent = i === index;
          return (
            <button
              key={q.id}
              onClick={() => onNavigate(i)}
              style={{
                backgroundColor: colors.bg,
                borderColor: isCurrent ? "var(--accent)" : colors.border,
                color: colors.bg === "transparent" ? "var(--foreground)" : colors.text,
                borderWidth: isCurrent ? 2 : 1,
              }}
              className="h-8 rounded text-xs font-medium flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              {q.number}
            </button>
          );
        })}
      </div>

      <div
        className={`rounded-lg border p-5 flex flex-col gap-4 ${
          qr.isCorrect ? "border-border" : "border-incorrect"
        }`}
      >
        <div className="flex items-center justify-between">
          {question.topic && <TopicBadge topic={question.topic} />}
          <span
            className="text-sm font-semibold"
            style={{ color: qr.isCorrect ? "var(--correct)" : "var(--incorrect)" }}
          >
            {qr.isCorrect ? "Correct" : qr.userAnswer ? "Incorrect" : "Not answered"}
          </span>
        </div>

        <QuestionBody question={question} />

        {question.type === "multiple_choice" && question.options && (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => {
              const isUser = qr.userAnswer === opt.label;
              const isCorrectOpt = question.correctAnswer === opt.label;
              let borderColor = "var(--border)";
              if (isCorrectOpt) borderColor = "var(--correct)";
              else if (isUser) borderColor = "var(--incorrect)";
              return (
                <div
                  key={opt.label}
                  style={{ borderColor }}
                  className="flex items-center gap-3 rounded-lg border-2 px-4 py-3"
                >
                  <span className="font-mono font-medium">{opt.label}</span>
                  {opt.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.imageUrl}
                      alt={`Option ${opt.label}`}
                      className="question-image h-16"
                    />
                  ) : (
                    <span>{opt.text}</span>
                  )}
                  {isCorrectOpt && (
                    <span className="ml-auto text-xs font-medium" style={{ color: "var(--correct)" }}>
                      Correct answer
                    </span>
                  )}
                  {isUser && !isCorrectOpt && (
                    <span className="ml-auto text-xs font-medium" style={{ color: "var(--incorrect)" }}>
                      Your answer
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {question.type === "free_response" && (
          <div className="text-sm flex flex-col gap-1">
            <span>
              Your answer: <span className="font-mono">{qr.userAnswer ?? "(no answer)"}</span>
            </span>
            {!qr.isCorrect && (
              <span>
                Correct answer: <span className="font-mono">{qr.correctAnswer}</span>
              </span>
            )}
          </div>
        )}

        {question.explanation && (
          <p className="text-sm text-muted border-t border-border pt-3">{question.explanation}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(Math.max(0, index - 1))}
          disabled={index === 0}
          className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onNavigate(Math.min(paper.questions.length - 1, index + 1))}
          disabled={index === paper.questions.length - 1}
          className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
