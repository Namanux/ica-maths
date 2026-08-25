"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateQuestions, type Question } from "@/lib/abacus/questionGenerator";
import { getSessionConfig, updateTimeLimitFromPerformance } from "@/lib/abacus/sessionStorage";
import { saveSession, updateStudentXp, getStudentProgress } from "@/lib/abacus/supabase";
import { getLevelTitle } from "@/lib/abacus/xp";
import { TimeMonster } from "@/components/abacus/TimeMonster";
import { QuestionDisplay } from "@/components/abacus/QuestionDisplay";
import { SessionResults } from "@/components/abacus/SessionResults";

const QUESTIONS_PER_SESSION = 10;
const BASE_XP = 10;
const FEEDBACK_DELAY_MS = 1000;

type Phase = "playing" | "feedback" | "finished";

function buildSession(level: number, lesson: number) {
  return {
    config: getSessionConfig(),
    questions: generateQuestions(level, lesson, QUESTIONS_PER_SESSION),
  };
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
  const [{ config, questions }, setSetup] = useState<{
    config: { timeLimitSeconds: number };
    questions: Question[];
  }>(() => buildSession(level, lesson));

  const [index, setIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimitSeconds);
  const [phase, setPhase] = useState<Phase>("playing");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [isRetreating, setIsRetreating] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [finalStats, setFinalStats] = useState<{ totalXp: number; levelTitle: string } | null>(
    null
  );

  // Set for real when a question actually starts (playAgain, advance); the
  // initial 0 is never read since the first question starts at time 0 too.
  const questionStartRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const currentQuestion = questions[index];

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, []);

  const advance = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      setPhase("finished");
      return;
    }
    setIndex(nextIndex);
    setTimeRemaining(config.timeLimitSeconds);
    setIsRetreating(false);
    setFeedback(null);
    setPhase("playing");
    questionStartRef.current = Date.now();
  }, [index, questions.length, config.timeLimitSeconds]);

  const handleAnswer = useCallback(
    (submitted: number | null) => {
      if (phase !== "playing") return;
      const elapsedMs = Date.now() - questionStartRef.current;
      responseTimesRef.current.push(elapsedMs);

      const correct = submitted !== null && submitted === currentQuestion.answer;
      let multiplier = 0;
      if (correct) {
        const fraction = timeRemaining / config.timeLimitSeconds;
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
    [phase, currentQuestion, timeRemaining, config.timeLimitSeconds, advance]
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
    if (phase !== "finished") return;

    const total = questions.length;
    const accuracy = (correctCount / total) * 100;
    const avgResponseTimeMs =
      responseTimesRef.current.reduce((a, b) => a + b, 0) /
      Math.max(responseTimesRef.current.length, 1);

    updateTimeLimitFromPerformance(avgResponseTimeMs);

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
      });
      await updateStudentXp(profileSlug, xpEarned, lesson, accuracy);
      const progress = await getStudentProgress(profileSlug);
      const totalXp = progress?.totalXp ?? xpEarned;
      setFinalStats({ totalXp, levelTitle: getLevelTitle(totalXp) });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const playAgain = () => {
    const next = buildSession(level, lesson);
    responseTimesRef.current = [];
    questionStartRef.current = Date.now();
    setSetup(next);
    setIndex(0);
    setTimeRemaining(next.config.timeLimitSeconds);
    setPhase("playing");
    setFeedback(null);
    setIsRetreating(false);
    setCorrectCount(0);
    setXpEarned(0);
    setFinalStats(null);
  };

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
        onPlayAgain={playAgain}
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
        timeLimit={config.timeLimitSeconds}
        timeRemaining={Math.max(timeRemaining, 0)}
        isRetreating={isRetreating}
      />
    </div>
  );
}
