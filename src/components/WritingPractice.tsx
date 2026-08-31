"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { WritingTask } from "@/data/writing-tasks";
import { formatDuration } from "@/lib/format";

type Phase = "intro" | "writing" | "done";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function TaskPrompt({ task }: { task: WritingTask }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-4 text-sm leading-relaxed flex flex-col gap-3">
      <div className="font-medium text-base">{task.title}</div>
      <p className="whitespace-pre-line">{task.scenario}</p>
      <p className="whitespace-pre-line font-medium">{task.instruction}</p>
      {task.startingSentence && (
        <p className="whitespace-pre-line border-l-2 border-border pl-3 italic">
          {task.startingSentence}
        </p>
      )}
      {task.guidance && task.guidance.length > 0 && (
        <div>
          <p>In your writing, you could include:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            {task.guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WritingPractice({
  task,
  slug,
  backHref,
}: {
  task: WritingTask;
  slug: string;
  backHref: string;
}) {
  const storageKey = `sel-writing-${task.id}-${slug}`;
  const totalSeconds = task.timeLimitMinutes * 60;

  const [phase, setPhase] = useState<Phase>("intro");
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [savedWords, setSavedWords] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load any saved draft on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setText(raw);
        setSavedWords(countWords(raw));
      }
    } catch {
      // ignore unavailable storage
    }
  }, [storageKey]);

  // Persist the draft as it changes.
  useEffect(() => {
    if (phase === "intro") return;
    try {
      localStorage.setItem(storageKey, text);
    } catch {
      // ignore unavailable storage
    }
  }, [text, phase, storageKey]);

  // Countdown while writing.
  useEffect(() => {
    if (phase !== "writing") return;
    if (secondsLeft <= 0) {
      setPhase("done");
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  const start = useCallback(() => {
    setText((prev) => (prev.trim() ? prev : task.startingSentence ?? ""));
    setSecondsLeft(totalSeconds);
    setPhase("writing");
    // focus + cursor to end after the textarea mounts
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }, [task.startingSentence, totalSeconds]);

  const resume = useCallback(() => {
    setSecondsLeft(totalSeconds);
    setPhase("writing");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [totalSeconds]);

  const startAgain = useCallback(() => {
    setText("");
    setSavedWords(0);
    setSecondsLeft(totalSeconds);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setPhase("intro");
  }, [storageKey, totalSeconds]);

  const words = countWords(text);
  const lowTime = phase === "writing" && secondsLeft <= 60;

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Writing — {task.code}
          </h1>
          <p className="text-muted mt-1">
            One writing task · {task.timeLimitMinutes} minutes · no marks, just practice
          </p>
        </div>

        <TaskPrompt task={task} />

        <ul className="text-sm text-muted list-disc pl-5 space-y-1">
          <li>You have {task.timeLimitMinutes} minutes once you start. Plan first, then write.</li>
          <li>Your draft is saved in this browser as you type, so you can come back to it.</li>
          <li>Nothing here is marked — the real test is marked by an assessor.</li>
        </ul>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={start}
            className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
          >
            Start writing
          </button>
          {savedWords > 0 && (
            <button
              onClick={resume}
              className="rounded-full border border-accent text-accent px-5 py-2.5 font-medium hover:bg-accent/10 transition-colors"
            >
              Continue saved draft ({savedWords} {savedWords === 1 ? "word" : "words"})
            </button>
          )}
          <Link
            href={backHref}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface transition-colors"
          >
            ← Tasks
          </Link>
          <span className="text-sm text-muted">
            {task.title} · {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-mono rounded-full px-3 py-1 border ${
              lowTime ? "border-incorrect text-incorrect" : "border-border"
            }`}
          >
            {phase === "done" ? "Time's up" : formatDuration(secondsLeft)}
          </span>
          {phase === "writing" && (
            <button
              onClick={() => setPhase("done")}
              className="rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Finish now
            </button>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-border text-sm">
        <summary className="cursor-pointer select-none px-4 py-2 font-medium">
          Show the task
        </summary>
        <div className="p-4 pt-0">
          <TaskPrompt task={task} />
        </div>
      </details>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={phase === "done"}
        placeholder="Write your response here…"
        className="w-full min-h-[55vh] rounded-lg border border-border bg-background p-4 leading-relaxed text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent/40 read-only:bg-surface/50 read-only:text-muted"
      />

      {phase === "done" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm">
            You wrote <span className="font-medium">{words}</span>{" "}
            {words === 1 ? "word" : "words"}
            {secondsLeft > 0
              ? ` and finished with ${formatDuration(secondsLeft)} to spare.`
              : " and used the full time."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startAgain}
              className="rounded-full bg-accent text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Start again
            </button>
            <Link
              href={backHref}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface transition-colors"
            >
              Back to Writing tasks
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
