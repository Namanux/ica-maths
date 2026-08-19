"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Paper, AttemptResult } from "@/lib/types";
import { scoreAttempt } from "@/lib/scoring";
import { saveAttempt } from "@/lib/attempts";
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
  const startTimeRef = useRef<number | null>(null);

  const finishExam = useCallback(() => {
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : paper.timeLimitMinutes * 60 - secondsLeft;
    const attempt = scoreAttempt(paper, answers, elapsed);
    setResult(attempt);
    setStatus("finished");
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
    return <ResultsView paper={paper} result={result} />;
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
        <p className="whitespace-pre-line leading-relaxed">{currentQuestion.prompt}</p>

        {currentQuestion.table && (
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  {currentQuestion.table.headers.map((h) => (
                    <th
                      key={h}
                      className="border border-border px-3 py-1.5 text-left bg-surface font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentQuestion.table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-border px-3 py-1.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentQuestion.imageUrl}
            alt={`Diagram for question ${currentQuestion.number}`}
            className="question-image max-w-full max-h-80 mx-auto"
          />
        )}

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

function ResultsView({ paper, result }: { paper: Paper; result: AttemptResult }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
        <p className="text-muted mt-1">{paper.title}</p>
      </div>

      <div className="rounded-lg border border-border p-6 flex flex-col items-center gap-1">
        <div className="text-4xl font-semibold">
          {result.score} / {result.totalQuestions}
        </div>
        <div className="text-muted">{result.percentage}% correct</div>
        <div className="text-sm text-muted mt-1">
          Time taken: {formatTime(result.timeTakenSeconds)}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Review</h2>
        {result.questionResults.map((qr) => {
          const question = paper.questions.find((q) => q.id === qr.questionId)!;
          return (
            <div
              key={qr.questionId}
              className={`rounded-lg border px-4 py-3 ${
                qr.isCorrect ? "border-border" : "border-incorrect"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Question {qr.questionNumber}</span>
                <span
                  className={qr.isCorrect ? "text-correct" : "text-incorrect"}
                  aria-label={qr.isCorrect ? "Correct" : "Incorrect"}
                >
                  {qr.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-muted mt-1 whitespace-pre-line">{question.prompt}</p>
              <div className="text-sm mt-2 flex flex-col gap-0.5">
                <span>
                  Your answer:{" "}
                  <span className="font-mono">{qr.userAnswer ?? "(no answer)"}</span>
                </span>
                {!qr.isCorrect && (
                  <span>
                    Correct answer: <span className="font-mono">{qr.correctAnswer}</span>
                  </span>
                )}
              </div>
              {question.explanation && (
                <p className="text-sm text-muted mt-2">{question.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href="/"
        className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
      >
        Back to papers
      </Link>
    </div>
  );
}
