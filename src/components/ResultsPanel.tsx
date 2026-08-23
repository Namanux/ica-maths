"use client";

import { useState } from "react";
import type { Paper, AttemptResult, QuestionResult } from "@/lib/types";
import { QuestionBody } from "@/components/QuestionBody";
import { TopicBadge } from "@/components/TopicBadge";
import { formatDuration, formatCompletedAt } from "@/lib/format";
import Link from "next/link";

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

function TimePerQuestion({
  result,
  onOpenQuestion,
}: {
  result: AttemptResult;
  onOpenQuestion: (i: number) => void;
}) {
  const timed = result.questionResults
    .filter((r) => typeof r.timeSpentSeconds === "number")
    .slice()
    .sort((a, b) => (b.timeSpentSeconds ?? 0) - (a.timeSpentSeconds ?? 0));

  if (timed.length === 0) return null;

  const maxTime = Math.max(...timed.map((r) => r.timeSpentSeconds ?? 0), 1);
  const avgTime =
    timed.reduce((sum, r) => sum + (r.timeSpentSeconds ?? 0), 0) / timed.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold tracking-wide uppercase text-muted">
          Time per question
        </h2>
        <p className="text-xs text-muted mt-1">
          Slowest first — a good place to spend extra time helping.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {timed.map((r) => {
          const t = r.timeSpentSeconds ?? 0;
          const pct = Math.round((t / maxTime) * 100);
          const struggled = t > avgTime * 1.5;
          const barColor = r.isCorrect ? "var(--correct)" : "var(--incorrect)";
          return (
            <button
              key={r.questionId}
              onClick={() => onOpenQuestion(r.questionNumber - 1)}
              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <span className="text-xs font-mono text-muted w-6 shrink-0">
                Q{r.questionNumber}
              </span>
              <div className="flex-1 h-4 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: barColor, opacity: 0.6 }}
                />
              </div>
              <span className="text-xs font-mono text-muted w-12 shrink-0 text-right">
                {formatDuration(Math.round(t))}
              </span>
              {struggled && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: "var(--incorrect)", border: "1px solid var(--incorrect)" }}
                >
                  Slow
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategorySpeedSummary({
  categoryBreakdown,
}: {
  categoryBreakdown: AttemptResult["categoryBreakdown"];
}) {
  const timed = categoryBreakdown.filter((c) => typeof c.avgTimeSeconds === "number");
  if (timed.length < 2) return null;

  const sorted = timed.slice().sort((a, b) => (a.avgTimeSeconds ?? 0) - (b.avgTimeSeconds ?? 0));
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  if (fastest.topic === slowest.topic) return null;

  return (
    <p className="text-xs text-muted mt-1">
      Fastest: <span className="font-medium">{fastest.topic}</span> (
      {formatDuration(fastest.avgTimeSeconds ?? 0)}/question) · Slowest:{" "}
      <span className="font-medium">{slowest.topic}</span> (
      {formatDuration(slowest.avgTimeSeconds ?? 0)}/question)
    </p>
  );
}

export interface ResultsPanelProps {
  paper: Paper;
  result: AttemptResult;
  mode: "live" | "historical";
  profileSlug: string;
  onResetAll?: () => void;
  onDelete?: () => void;
}

export function ResultsPanel({
  paper,
  result,
  mode,
  profileSlug,
  onResetAll,
  onDelete,
}: ResultsPanelProps) {
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
      profileSlug={profileSlug}
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
  profileSlug,
  onOpenQuestion,
  onResetAll,
  onDelete,
}: {
  paper: Paper;
  result: AttemptResult;
  mode: "live" | "historical";
  profileSlug: string;
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
          href={`/${profileSlug}/icas`}
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
        <div className="text-sm text-muted text-center">
          <div>Completed {formatCompletedAt(result.completedAt)}</div>
          <div>Duration: {formatDuration(result.timeTakenSeconds)}</div>
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

      <TimePerQuestion result={result} onOpenQuestion={onOpenQuestion} />

      {result.categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-semibold tracking-wide uppercase text-muted">
              By Category
            </h2>
            <CategorySpeedSummary categoryBreakdown={result.categoryBreakdown} />
          </div>
          <div className="flex flex-col gap-3">
            {result.categoryBreakdown.map((c) => {
              const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
              return (
                <div key={c.topic} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <TopicBadge topic={c.topic} />
                    <span className="text-sm text-muted flex items-center gap-2">
                      {typeof c.avgTimeSeconds === "number" && (
                        <span className="font-mono text-xs">
                          {formatDuration(c.avgTimeSeconds)}/question
                        </span>
                      )}
                      <span>{c.correct}/{c.total} correct</span>
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
        <div className="flex items-center justify-between gap-3">
          {question.topic && <TopicBadge topic={question.topic} />}
          <div className="flex items-center gap-3">
            {typeof qr.timeSpentSeconds === "number" && (
              <span className="text-xs font-mono text-muted">
                {formatDuration(Math.round(qr.timeSpentSeconds))}
              </span>
            )}
            <span
              className="text-sm font-semibold"
              style={{ color: qr.isCorrect ? "var(--correct)" : "var(--incorrect)" }}
            >
              {qr.isCorrect ? "Correct" : qr.userAnswer ? "Incorrect" : "Not answered"}
            </span>
          </div>
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
