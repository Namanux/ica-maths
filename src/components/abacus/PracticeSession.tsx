"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateQuestions, type Question } from "@/lib/abacus/questionGenerator";
import { saveSession, saveProgressionResult, getStudentProgress } from "@/lib/abacus/supabase";
import { getLevelTitle } from "@/lib/abacus/xp";
import {
  calculateNextPosition,
  getContentSource,
  type ProgressionResult,
} from "@/lib/abacus/progressionEngine";
import { TimeMonster } from "@/components/abacus/TimeMonster";
import { QuestionDisplay } from "@/components/abacus/QuestionDisplay";
import { SessionResults } from "@/components/abacus/SessionResults";

const BASE_XP = 10;
const FEEDBACK_DELAY_MS = 1000;

// Used when a student has no progress row yet — mirrors abacus_progress's
// own column defaults so a brand-new student's first session matches what
// they'd get once that row exists.
const DEFAULT_PROGRESS = {
  contentBlock: 1,
  speedSeconds: 15,
  displayLevel: 1,
  accuracyThreshold: 100,
  questionsPerSession: 5,
  totalXp: 0,
};

type StartProgress = typeof DEFAULT_PROGRESS;

type Phase = "loading" | "playing" | "feedback" | "finished";

function outcomeMessage(progression: ProgressionResult): string {
  if (progression.contentIncreased) return "🎉 New challenge unlocked!";
  if (progression.speedIncreased && progression.timerReset) return "🎉 New challenge unlocked!";
  if (progression.speedIncreased) return "⚡ Speed increased!";
  return "Keep going — you're getting there! 💪";
}

export function PracticeSession({
  level,
  lesson,
  profileSlug,
}: {
  level: number;
  lesson: number;
  profileSlug: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [startProgress, setStartProgress] = useState<StartProgress | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [index, setIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [isRetreating, setIsRetreating] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [finalStats, setFinalStats] = useState<{
    totalXp: number;
    levelTitle: string;
    message: string;
  } | null>(null);

  const questionStartRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const currentQuestion = questions[index];

  const startSession = useCallback(async () => {
    const progress = await getStudentProgress(profileSlug);
    const position: StartProgress = progress
      ? {
          contentBlock: progress.contentBlock,
          speedSeconds: progress.speedSeconds,
          displayLevel: progress.displayLevel,
          accuracyThreshold: progress.accuracyThreshold,
          questionsPerSession: progress.questionsPerSession,
          totalXp: progress.totalXp,
        }
      : DEFAULT_PROGRESS;

    const { level: contentLevel, lesson: contentLesson } = getContentSource(
      position.contentBlock
    );

    setStartProgress(position);
    setQuestions(generateQuestions(contentLevel, contentLesson, position.questionsPerSession));
    setTimeRemaining(position.speedSeconds);
    responseTimesRef.current = [];
    setIndex(0);
    setCorrectCount(0);
    setXpEarned(0);
    setFeedback(null);
    setIsRetreating(false);
    setFinalStats(null);
    questionStartRef.current = Date.now();
    setPhase("playing");
  }, [profileSlug]);

  useEffect(() => {
    const timeout = setTimeout(() => void startSession(), 0);
    return () => clearTimeout(timeout);
  }, [startSession]);

  const advance = useCallback(() => {
    if (!startProgress) return;
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      setPhase("finished");
      return;
    }
    setIndex(nextIndex);
    setTimeRemaining(startProgress.speedSeconds);
    setIsRetreating(false);
    setFeedback(null);
    setPhase("playing");
    questionStartRef.current = Date.now();
  }, [index, questions.length, startProgress]);

  const handleAnswer = useCallback(
    (submitted: number | null) => {
      if (phase !== "playing" || !startProgress) return;
      const elapsedMs = Date.now() - questionStartRef.current;
      responseTimesRef.current.push(elapsedMs);

      const correct = submitted !== null && submitted === currentQuestion.answer;
      let multiplier = 0;
      if (correct) {
        const fraction = timeRemaining / startProgress.speedSeconds;
        if (fraction > 2 / 3) multiplier = 3;
        else if (fraction > 1 / 3) multiplier = 2;
        else multiplier = 1;
        setCorrectCount((c) => c + 1);
        setIsRetreating(true);
      }
      setXpEarned((xp) => xp + BASE_XP * multiplier);
      setFeedback(correct ? "correct" : "incorrect");
      setPhase("feedback");

      setTimeout(advance, FEEDBACK_DELAY_MS);
    },
    [phase, startProgress, currentQuestion, timeRemaining, advance]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeRemaining <= 0) {
      const timeout = setTimeout(() => handleAnswer(null), 0);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeRemaining, handleAnswer]);

  useEffect(() => {
    if (phase !== "finished" || !startProgress) return;

    const total = questions.length;
    const accuracy = (correctCount / total) * 100;
    const avgResponseTimeMs =
      responseTimesRef.current.reduce((a, b) => a + b, 0) /
      Math.max(responseTimesRef.current.length, 1);

    const progression = calculateNextPosition(
      startProgress.contentBlock,
      startProgress.speedSeconds,
      startProgress.displayLevel,
      {
        accuracy,
        avgResponseTimeMs,
        speedSeconds: startProgress.speedSeconds,
        accuracyThreshold: startProgress.accuracyThreshold,
      }
    );

    void (async () => {
      await saveSession({
        profileSlug,
        level,
        lesson,
        score: xpEarned,
        accuracy,
        xpEarned,
        avgResponseTimeMs,
        questionsTotal: total,
        questionsCorrect: correctCount,
        speedSeconds: startProgress.speedSeconds,
        contentBlock: startProgress.contentBlock,
      });
      await saveProgressionResult(profileSlug, progression, xpEarned);
      const progress = await getStudentProgress(profileSlug);
      const totalXp = progress?.totalXp ?? startProgress.totalXp + xpEarned;
      setFinalStats({
        totalXp,
        levelTitle: getLevelTitle(totalXp),
        message: outcomeMessage(progression),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "loading" || !startProgress) {
    return <div className="text-center text-muted py-12">Loading your session…</div>;
  }

  if (phase === "finished") {
    if (!finalStats) {
      return <div className="text-center text-muted py-12">Saving your results…</div>;
    }
    return (
      <SessionResults
        questionsTotal={questions.length}
        questionsCorrect={correctCount}
        accuracy={(correctCount / questions.length) * 100}
        xpEarned={xpEarned}
        totalXp={finalStats.totalXp}
        levelTitle={finalStats.levelTitle}
        outcomeMessage={finalStats.message}
        onPlayAgain={() => void startSession()}
        onBack={() => router.push(`/${profileSlug}/abacus`)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-[70vh]">
      <div className="text-sm text-muted">
        Question {index + 1} of {questions.length}
      </div>

      <QuestionDisplay
        key={currentQuestion.id}
        question={currentQuestion}
        onAnswer={handleAnswer}
        isDisabled={phase === "feedback"}
        feedback={feedback}
      />

      <TimeMonster
        timeLimit={startProgress.speedSeconds}
        timeRemaining={Math.max(timeRemaining, 0)}
        isRetreating={isRetreating}
      />
    </div>
  );
}
