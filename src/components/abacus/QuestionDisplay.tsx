"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/abacus/questionGenerator";

export function QuestionDisplay({
  question,
  onAnswer,
  isDisabled,
  feedback,
}: {
  question: Question;
  onAnswer: (answer: number) => void;
  isDisabled: boolean; // true during feedback flash (1 second after answering)
  feedback: "correct" | "incorrect" | null;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The parent remounts this component per question (key={question.id}), so
  // `value` already starts fresh — this only needs to run once per mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (isDisabled || value.trim() === "") return;
    onAnswer(Number(value));
  };

  const flashClass =
    feedback === "correct"
      ? "border-correct bg-correct/15"
      : feedback === "incorrect"
      ? "border-incorrect bg-incorrect/15"
      : "border-border";

  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-lg border p-8 transition-colors ${flashClass}`}
    >
      <div className="text-[3rem] leading-none font-bold text-center">{question.display}</div>
      <p className="text-muted text-center">{question.prompt}</p>
      {question.hint && <p className="text-xs text-muted text-center">{question.hint}</p>}
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={value}
        disabled={isDisabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="?"
        className="w-40 text-center text-2xl rounded-lg border border-border bg-background px-4 py-3"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isDisabled}
        className="rounded-full bg-accent text-background px-6 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
