"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Paper, AttemptResult } from "@/lib/types";
import { scoreAttempt, isAnswerCorrect } from "@/lib/scoring";
import { paperExam, examHomeSlug } from "@/lib/papers";
import { saveAttempt } from "@/lib/attempts";
import { reportLiveState } from "@/lib/liveSessions";
import { getProfile } from "@/lib/profiles";
import { QuestionBody } from "@/components/QuestionBody";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ReportIssueButton } from "@/components/ReportIssueButton";
import Link from "next/link";

// Zones only occupy the empty margin outside the centered max-w-4xl content
// column, never the content itself — so they can never intercept a tap meant
// for an answer option. On narrow/mobile screens that margin shrinks toward
// nothing, which is fine: arrow keys and the on-screen chevrons still work.
const EDGE_ZONE_WIDTH = "clamp(16px, calc((100vw - 896px) / 2), 160px)";

function EdgeNavZone({
  direction,
  onClick,
  disabled,
}: {
  direction: "previous" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const isLeft = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isLeft ? "Previous question" : "Next question"}
      className={`flex fixed inset-y-0 ${
        isLeft ? "left-0" : "right-0"
      } items-center justify-center text-muted hover:text-foreground hover:bg-surface/60 transition-colors disabled:opacity-0 disabled:pointer-events-none`}
      style={{ width: EDGE_ZONE_WIDTH }}
    >
      <span aria-hidden className="text-2xl">
        {isLeft ? "‹" : "›"}
      </span>
    </button>
  );
}

type Status = "intro" | "in_progress" | "finished";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExamRunner({ paper, profileSlug }: { paper: Paper; profileSlug: string }) {
  const router = useRouter();
  const examSlug = paperExam(paper);
  const sectionLabel =
    { "selective-test": "Selective", edutest: "EduTest", naplan: "NAPLAN" }[
      examSlug
    ] ?? "ICAS";
  const examHref = `/${profileSlug}/${examHomeSlug(paper)}`;
  const [status, setStatus] = useState<Status>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [secondsLeft, setSecondsLeft] = useState(paper.timeLimitMinutes * 60);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const questionTimeRef = useRef<Record<string, number>>({});
  // Reset in startExam/resetAll before it's ever read — the initial value is never used.
  const questionEnteredAtRef = useRef<number>(0);

  const flushQuestionTime = useCallback((questionId: string) => {
    const elapsed = (Date.now() - questionEnteredAtRef.current) / 1000;
    questionTimeRef.current[questionId] = (questionTimeRef.current[questionId] ?? 0) + elapsed;
    questionEnteredAtRef.current = Date.now();
  }, []);

  const finishExam = useCallback(() => {
    if (status === "in_progress") flushQuestionTime(paper.questions[currentIndex].id);
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : paper.timeLimitMinutes * 60 - secondsLeft;
    const attempt = scoreAttempt(paper, answers, elapsed, questionTimeRef.current);
    setResult(attempt);
    setStatus("finished");
    void saveAttempt({ ...attempt, paperTitle: paper.title, profileSlug });
  }, [status, currentIndex, answers, paper, secondsLeft, profileSlug, flushQuestionTime]);

  useEffect(() => {
    if (status !== "in_progress" || reviewMode) return;
    if (secondsLeft <= 0) {
      finishExam();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft, reviewMode, finishExam]);

  useEffect(() => {
    document.body.classList.toggle("exam-focus", status === "in_progress");
    return () => document.body.classList.remove("exam-focus");
  }, [status]);

  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const profileName = getProfile(profileSlug)?.name ?? profileSlug;
      if (status === "intro") {
        void reportLiveState({
          profileSlug,
          profileName,
          section: sectionLabel,
          pageLabel: paper.title,
          paperId: paper.id,
          paperTitle: paper.title,
          questionNumber: null,
          totalQuestions: paper.questions.length,
          answers: null,
          lastAnswerLabel: null,
          lastAnswerCorrect: null,
          examStatus: "intro",
          secondsLeft: null,
        });
        return;
      }
      const q = paper.questions[currentIndex];
      const currentAnswer = answers[q.id] ?? null;
      void reportLiveState({
        profileSlug,
        profileName,
        section: sectionLabel,
        pageLabel: paper.title,
        paperId: paper.id,
        paperTitle: paper.title,
        questionNumber: q.number,
        totalQuestions: paper.questions.length,
        answers,
        lastAnswerLabel: currentAnswer,
        lastAnswerCorrect: currentAnswer === null ? null : isAnswerCorrect(currentAnswer, q),
        examStatus: status,
        secondsLeft: reviewMode ? null : secondsLeftRef.current,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [status, currentIndex, answers, paper, profileSlug, reviewMode, sectionLabel]);

  const startExam = (review: boolean) => {
    startTimeRef.current = Date.now();
    questionEnteredAtRef.current = Date.now();
    setReviewMode(review);
    setStatus("in_progress");
  };

  const cancelExam = () => {
    if (!window.confirm("Cancel this exam? Your progress on this attempt will be lost.")) return;
    router.push(examHref);
  };

  const resetAll = () => {
    questionTimeRef.current = {};
    questionEnteredAtRef.current = Date.now();
    setAnswers({});
    setSecondsLeft(paper.timeLimitMinutes * 60);
    setResult(null);
    setCurrentIndex(0);
    setReviewMode(false);
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

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(paper.questions.length - 1, index));
    if (clamped === currentIndex) return;
    if (status === "in_progress") flushQuestionTime(currentQuestion.id);
    setCurrentIndex(clamped);
  };

  // Keyboard shortcuts: arrows/J/K to move, 1-4 or A-D to pick an answer.
  useEffect(() => {
    if (status !== "in_progress") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "j") {
        e.preventDefault();
        goToIndex(currentIndex + 1);
      } else if (key === "arrowleft" || key === "k") {
        e.preventDefault();
        goToIndex(currentIndex - 1);
      } else if (currentQuestion.type === "multiple_choice" && currentQuestion.options) {
        const numIdx = ["1", "2", "3", "4", "5", "6", "7", "8"].indexOf(key);
        const letterIdx = ["a", "b", "c", "d", "e", "f", "g", "h"].indexOf(key);
        const pick = numIdx !== -1 ? numIdx : letterIdx;
        const option = pick !== -1 ? currentQuestion.options[pick] : undefined;
        if (option) selectAnswer(option.label);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentIndex, currentQuestion]);

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
          <li>Review Only has no timer — take as long as you need.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => startExam(false)}
            className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
          >
            Start exam
          </button>
          <button
            onClick={() => startExam(true)}
            className="rounded-full border border-accent text-accent px-5 py-2.5 font-medium hover:bg-accent/10 transition-colors"
          >
            Review Only
          </button>
          <Link
            href={examHref}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (status === "finished" && result) {
    return (
      <ResultsPanel
        paper={paper}
        result={result}
        mode="live"
        profileSlug={profileSlug}
        onResetAll={resetAll}
      />
    );
  }

  const userAnswer = answers[currentQuestion.id] ?? null;

  return (
    <div className="relative flex flex-col gap-5 min-h-[80vh]">
      <EdgeNavZone
        direction="previous"
        onClick={() => goToIndex(currentIndex - 1)}
        disabled={currentIndex === 0}
      />
      <EdgeNavZone
        direction="next"
        onClick={() => goToIndex(currentIndex + 1)}
        disabled={currentIndex === paper.questions.length - 1}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={cancelExam}
            className="rounded-full border border-incorrect text-incorrect px-4 py-1.5 text-sm font-medium hover:bg-incorrect/10 transition-colors"
          >
            Cancel
          </button>
          <div className="text-sm text-muted">
            Question {currentQuestion.number} of {paper.questions.length} · {answeredCount} answered
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`text-sm font-mono rounded-full px-3 py-1 border ${
              !reviewMode && secondsLeft <= 60 ? "border-incorrect text-incorrect" : "border-border"
            }`}
          >
            {reviewMode ? "No time limit" : formatTime(secondsLeft)}
          </div>
          <button
            onClick={finishExam}
            className="rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Submit exam
          </button>
        </div>
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

      <ReportIssueButton
        key={currentQuestion.id}
        paperId={paper.id}
        paperTitle={paper.title}
        questionId={currentQuestion.id}
        questionNumber={currentQuestion.number}
        profileSlug={profileSlug}
      />

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted">
          Jump to a question
        </span>
        <div className="flex flex-wrap gap-1.5">
          {paper.questions.map((q, i) => {
            const answered = answers[q.id] !== undefined && answers[q.id] !== null;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => goToIndex(i)}
                className={`h-11 w-11 text-sm rounded border flex items-center justify-center transition-colors ${
                  isCurrent
                    ? "border-accent bg-accent text-background"
                    : answered
                    ? "border-border text-blue-600 dark:text-blue-400 font-semibold"
                    : "border-border"
                }`}
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
