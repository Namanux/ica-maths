"use client";

import { useState } from "react";
import type { Paper, AttemptResult, QuestionResult } from "@/lib/types";
import { QuestionBody } from "@/components/QuestionBody";
import { TopicBadge } from "@/components/TopicBadge";
import Link from "next/link";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

export interface ResultsPanelProps {
  paper: Paper;
  result: AttemptResult;
  mode: "live" | "historical";
  onResetAll?: () => void;
  onDelete?: () => void;
}

export function ResultsPanel({ paper, result, mode, onResetAll, onDelete }: ResultsPanelProps) {
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

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
      mode={mode}
      onOpenQuestion={(i) => setReviewIndex(i)}
      onResetAll={onResetAll}
      onDelete={onDelete}
    />
  );
}

function ResultsView({
  paper,
  result,
  mode,
  onOpenQuestion,
  onResetAll,
  onDelete,
}: {
  paper: Paper;
  result: AttemptResult;
  mode: "live" | "historical";
  onOpenQuestion: (i: number) => void;
  onResetAll?: () => void;
  onDelete?: () => void;
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
          {mode === "live" && onResetAll && (
            <button
              onClick={() => {
                if (window.confirm("Reset this attempt and start over?")) onResetAll();
              }}
              className="rounded-full border border-incorrect text-incorrect px-4 py-2 text-sm font-medium hover:bg-incorrect/10 transition-colors"
            >
              Reset All
            </button>
          )}
          {mode === "historical" && onDelete && (
            <button
              onClick={() => {
                if (window.confirm("Delete this attempt? This can't be undone.")) onDelete();
              }}
              className="rounded-full border border-incorrect text-incorrect px-4 py-2 text-sm font-medium hover:bg-incorrect/10 transition-colors"
            >
              Delete attempt
            </button>
          )}
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

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted">
          Jump to a question
        </span>
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
      </div>
    </div>
  );
}
