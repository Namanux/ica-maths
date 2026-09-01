"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  promptPool,
  WRITING_DURATION_SECONDS as DURATION,
  type WritingGenre,
  type WritingPrompt,
} from "@/data/icas-writing-prompts";
import {
  clampScore,
  computeTotal,
  findPreviousAttempt,
  improvementStreak,
  loadHistory,
  saveHistory,
  SCORE_KEYS,
  type DetailedReport,
  type WritingAttempt,
  type WritingScores,
} from "@/lib/icas-writing-history";
import {
  requestDetail,
  requestRewrite,
  requestScore,
} from "./feedbackClient";
import { FeedbackPanel, type FeedbackState } from "./FeedbackPanel";
import { OnScreenKeyboard } from "./OnScreenKeyboard";
import { HistoryModal, type RetestPayload } from "./HistoryModal";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** The prompt body is rendered with dangerouslySetInnerHTML (for the static
 *  <strong> markup in the built-in prompts), so custom text must be escaped. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Phase = "idle" | "writing" | "submitted";

const EMPTY_FEEDBACK: FeedbackState = {
  scoreLoading: false,
  score: null,
  scoreError: null,
  detailLoading: false,
  detail: null,
  detailError: null,
  rewriteLoading: false,
  rewriteError: null,
};

export function WritingApp({ slug }: { slug: string }) {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<WritingAttempt[]>([]);

  const [genre, setGenre] = useState<WritingGenre>("narrative");
  const [promptIndex, setPromptIndex] = useState(0);
  const [customPrompt, setCustomPrompt] = useState<WritingPrompt | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [reached35, setReached35] = useState(false);
  const [wordsAt35, setWordsAt35] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState>(EMPTY_FEEDBACK);
  const [reward, setReward] = useState<{ title: string; sub: string; stars: number } | null>(
    null,
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyView, setHistoryView] = useState<"list" | "cheat" | "reminders">("list");
  const [customOpen, setCustomOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTsRef = useRef<number | null>(null);
  const recordSavedRef = useRef(false);
  const detailStartedRef = useRef(false);
  const submittedTextRef = useRef("");

  // ── Initial load: history + first task ───────────────────────────────────
  useEffect(() => {
    const h = loadHistory(slug);
    setHistory(h);
    const lastType = h.length ? h[h.length - 1].taskType : null;
    const g: WritingGenre = lastType
      ? lastType === "narrative"
        ? "persuasive"
        : "narrative"
      : Math.random() < 0.5
        ? "narrative"
        : "persuasive";
    setGenre(g);
    setPromptIndex(Math.floor(Math.random() * promptPool(g).length));
    setReady(true);
  }, [slug]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Focus mode: hide the site header while this immersive view is mounted
  // (same mechanism the exam runner uses).
  useEffect(() => {
    document.body.classList.add("exam-focus");
    return () => document.body.classList.remove("exam-focus");
  }, []);

  // Keep the fullscreen toggle in sync with the browser's own state.
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const prompt: WritingPrompt = useMemo(
    () => customPrompt ?? promptPool(genre)[promptIndex] ?? promptPool(genre)[0],
    [customPrompt, genre, promptIndex],
  );

  const words = countWords(text);
  const wpm = elapsed >= 6 ? Math.round(words / (elapsed / 60)) : 0;
  const overtime = elapsed > DURATION;
  const timeLabel = overtime ? `+${fmt(elapsed - DURATION)}` : fmt(DURATION - elapsed);

  // ── Timer ───────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setElapsed((prev) => {
      const next = prev + 1;
      if (next === DURATION) {
        setReached35(true);
        setWordsAt35(countWords(textareaRef.current?.value ?? ""));
      }
      return next;
    });
  }, []);

  const start = () => {
    setPhase("writing");
    setElapsed(0);
    setReached35(false);
    setWordsAt35(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("idle");
    setText("");
    setElapsed(0);
    setReached35(false);
    setWordsAt35(null);
    setFeedback(EMPTY_FEEDBACK);
    setReward(null);
    recordTsRef.current = null;
    recordSavedRef.current = false;
    detailStartedRef.current = false;
    submittedTextRef.current = "";
  };

  // ── Feedback orchestration ──────────────────────────────────────────────
  const saveRecordAndReward = useCallback(
    (score: { scores: WritingScores; strengths: string[]; tips: string[] }) => {
      if (recordSavedRef.current) return;
      recordSavedRef.current = true;

      const total = computeTotal(score.scores);
      const prevTotal = history.length ? history[history.length - 1].total : null;
      const bestPrior = history.length
        ? Math.max(...history.map((h) => h.total))
        : null;
      const streak = improvementStreak(history, total);

      const record: WritingAttempt = {
        ts: Date.now(),
        dateLabel: new Date().toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        taskType: genre,
        taskTitle: prompt.title,
        taskBody: prompt.body,
        responseText: submittedTextRef.current,
        wordsAt35: reached35 ? wordsAt35 : null,
        finalWords: countWords(submittedTextRef.current),
        timeUsed: fmt(elapsed),
        wpm,
        scores: score.scores,
        strengths: score.strengths,
        tips: score.tips,
        total,
        detailedReport: null,
      };
      recordTsRef.current = record.ts;
      const next = history.concat([record]);
      saveHistory(slug, next);
      setHistory(next);

      const stars = Math.max(1, Math.min(5, Math.round((total / 25) * 5)));
      let title: string;
      let sub: string;
      if (history.length === 0) {
        title = "First attempt logged!";
        sub = `This is the baseline — next time, try to beat ${total}/25.`;
      } else if (bestPrior === null || total > bestPrior) {
        title = `New personal best — ${total}/25!`;
        sub =
          streak > 1
            ? `On a ${streak}-attempt improvement streak. Keep it up!`
            : "That beats every attempt so far.";
      } else if (prevTotal !== null && total > prevTotal) {
        title = "Better than last time!";
        sub = `Up from ${prevTotal} to ${total} out of 25.`;
      } else if (prevTotal !== null && total === prevTotal) {
        title = `Steady at ${total}/25`;
        sub = "Same score as last time — pick one tip below to push past it.";
      } else {
        title = `Logged — ${total}/25`;
        sub = `Last attempt was ${prevTotal}/25. Review the tips below and try again.`;
      }
      setReward({ title, sub, stars });
    },
    [history, genre, prompt, reached35, wordsAt35, elapsed, wpm, slug],
  );

  const attachToRecord = useCallback(
    (patch: Partial<WritingAttempt>) => {
      const ts = recordTsRef.current;
      if (ts == null) return;
      setHistory((prev) => {
        const next = prev.map((h) => (h.ts === ts ? { ...h, ...patch } : h));
        saveHistory(slug, next);
        return next;
      });
    },
    [slug],
  );

  const runScore = useCallback(async () => {
    const responseText = submittedTextRef.current.trim();
    if (!responseText) {
      setFeedback((f) => ({ ...f, scoreError: "There's no writing to score yet." }));
      return;
    }
    setFeedback((f) => ({ ...f, scoreLoading: true, scoreError: null }));
    const prev = findPreviousAttempt(history, responseText);
    try {
      const score = await requestScore({
        taskType: genre,
        taskTitle: prompt.title,
        responseText,
        wordCount: countWords(responseText),
        timeUsed: elapsed >= 20 ? fmt(elapsed) : undefined,
        isRevision: !!prev,
        previousTotal: prev?.total ?? null,
      });
      const scores = SCORE_KEYS.reduce((acc, k) => {
        acc[k] = clampScore(score.scores?.[k]);
        return acc;
      }, {} as WritingScores);
      const clean = {
        scores,
        strengths: score.strengths ?? [],
        tips: score.tips ?? [],
      };
      setFeedback((f) => ({ ...f, scoreLoading: false, score: clean }));
      saveRecordAndReward(clean);
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        scoreLoading: false,
        scoreError: err instanceof Error ? err.message : "Couldn't get feedback right now.",
      }));
    }
  }, [history, genre, prompt, elapsed, saveRecordAndReward]);

  const runRewrite = useCallback(
    async (baseDetail: DetailedReport) => {
      setFeedback((f) => ({ ...f, rewriteLoading: true, rewriteError: null }));
      try {
        const rw = await requestRewrite({
          taskType: genre,
          taskTitle: prompt.title,
          responseText: submittedTextRef.current,
        });
        const merged: DetailedReport = {
          ...baseDetail,
          aiRewrite: { rewrite: rw.rewrite, changesSummary: rw.changesSummary ?? [] },
        };
        setFeedback((f) => ({ ...f, rewriteLoading: false, detail: merged }));
        attachToRecord({ detailedReport: merged });
      } catch (err) {
        setFeedback((f) => ({
          ...f,
          rewriteLoading: false,
          rewriteError:
            err instanceof Error ? err.message : "Couldn't generate the AI rewrite.",
        }));
      }
    },
    [genre, prompt, attachToRecord],
  );

  const runDetail = useCallback(async () => {
    if (detailStartedRef.current) return;
    const responseText = submittedTextRef.current.trim();
    if (!responseText) return;
    detailStartedRef.current = true;
    setFeedback((f) => ({ ...f, detailLoading: true, detailError: null }));
    const prev = findPreviousAttempt(history, responseText);
    try {
      const detail = await requestDetail({
        taskType: genre,
        taskTitle: prompt.title,
        responseText,
        isRevision: !!prev,
      });
      setFeedback((f) => ({ ...f, detailLoading: false, detail }));
      attachToRecord({ detailedReport: detail });
      void runRewrite(detail);
    } catch (err) {
      detailStartedRef.current = false;
      setFeedback((f) => ({
        ...f,
        detailLoading: false,
        detailError:
          err instanceof Error ? err.message : "Couldn't load the detailed view right now.",
      }));
    }
  }, [history, genre, prompt, attachToRecord, runRewrite]);

  const submit = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    submittedTextRef.current = text;
    recordSavedRef.current = false;
    recordTsRef.current = null;
    detailStartedRef.current = false;
    setPhase("submitted");
    setFeedback(EMPTY_FEEDBACK);
    void runScore();
  };

  const applyRetest = (payload: RetestPayload) => {
    setGenre(payload.taskType);
    setCustomPrompt({ title: payload.taskTitle, body: payload.taskBody });
    reset();
    setPromptOpen(true);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Task navigation (only while idle) ───────────────────────────────────
  const cycleTopic = (dir: 1 | -1) => {
    setCustomPrompt(null);
    const pool = promptPool(genre);
    setPromptIndex((i) => ((i + dir) % pool.length + pool.length) % pool.length);
  };
  const switchGenre = (g: WritingGenre) => {
    if (g === genre && !customPrompt) return;
    setCustomPrompt(null);
    setGenre(g);
    setPromptIndex(Math.floor(Math.random() * promptPool(g).length));
  };

  const left = DURATION - elapsed;
  const timeTone: "warn" | "danger" | "over" | undefined = overtime
    ? "over"
    : left <= 60
      ? "danger"
      : left <= 300
        ? "warn"
        : undefined;

  const toneClass = (tone?: "warn" | "danger" | "over") =>
    tone === "danger"
      ? "text-incorrect"
      : tone === "over"
        ? "text-sky-600 dark:text-sky-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground";

  const statPill = (
    label: string,
    value: string | number,
    tone?: "warn" | "danger" | "over",
    className = "",
  ) => (
    <span
      className={`flex items-baseline gap-1 rounded-md border border-border bg-surface/40 px-2 py-1 ${className}`}
    >
      <span className={`font-mono text-sm font-bold tabular-nums ${toneClass(tone)}`}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-muted">{label}</span>
    </span>
  );

  const menuItem =
    "block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-surface transition-colors";

  const shell = "fixed inset-0 z-40 flex flex-col bg-background text-foreground no-print";

  if (!ready) {
    return (
      <div className={`${shell} items-center justify-center`}>
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      {/* Not a <header> element: the app's focus-mode CSS hides all <header>s. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2 sm:px-4">
        <Link
          href={`/${slug}`}
          className="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm font-medium text-muted hover:bg-surface hover:text-foreground transition-colors"
        >
          ✕ Exit
        </Link>
        <div className="hidden min-w-0 flex-1 sm:block">
          <h1 className="truncate text-sm font-semibold leading-tight">
            {genre === "narrative" ? "Narrative" : "Persuasive"} writing task
          </h1>
          <p className="truncate text-[11px] text-muted">
            Task: {prompt.title}
            {customPrompt && " · custom"} · 35 min
          </p>
        </div>

        <div className="flex flex-1 items-center gap-1.5 sm:flex-none">
          {statPill("Time", timeLabel, timeTone)}
          {statPill("Words", words)}
          {statPill("WPM", wpm, undefined, "hidden sm:flex")}
          {statPill("@35", wordsAt35 ?? "––", undefined, "hidden md:flex")}
        </div>

        {phase === "idle" && (
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-accent px-5 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            Start
          </button>
        )}
        {phase === "writing" && (
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-accent px-5 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            Submit
          </button>
        )}
        {phase === "submitted" && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface"
          >
            New task
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-surface"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    toggleFullscreen();
                    setMenuOpen(false);
                  }}
                >
                  {isFullscreen ? "Exit full screen" : "Full screen"}
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setHistoryView("list");
                    setHistoryOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  History
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setHistoryView("cheat");
                    setHistoryOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Quick reference
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setHistoryView("reminders");
                    setHistoryOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Quick reminders
                </button>
                {phase === "idle" && (
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setCustomOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    Custom task…
                  </button>
                )}
                {phase !== "idle" && (
                  <button
                    type="button"
                    className={`${menuItem} text-incorrect`}
                    onClick={() => {
                      reset();
                      setMenuOpen(false);
                    }}
                  >
                    Reset &amp; clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4">
          {/* Task navigation (idle only) */}
          {phase === "idle" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => cycleTopic(-1)}
                className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface"
              >
                ‹ Prev topic
              </button>
              <button
                type="button"
                onClick={() => cycleTopic(1)}
                className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface"
              >
                Next topic ›
              </button>
              <div className="mx-1 h-6 w-px bg-border" />
              {(["narrative", "persuasive"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => switchGenre(g)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    genre === g
                      ? "border-accent bg-accent text-background"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Prompt (collapsible) */}
          <div
            className={`rounded-lg border border-border bg-surface/40 border-l-2 ${
              genre === "persuasive" ? "border-l-amber-500" : "border-l-emerald-500"
            }`}
          >
            <button
              type="button"
              onClick={() => setPromptOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
            >
              <span className="truncate font-sans text-[11px] uppercase tracking-wide text-muted">
                Task: {prompt.title} · {genre === "narrative" ? "Narrative" : "Persuasive"}
              </span>
              <span className="shrink-0 text-xs text-muted">{promptOpen ? "Hide ▾" : "Show ▸"}</span>
            </button>
            {promptOpen && (
              <div className="px-4 pb-4 font-serif text-[15px] leading-relaxed">
                {prompt.body.map((para, i) => (
                  <p
                    key={i}
                    className="mb-2 last:mb-0"
                    dangerouslySetInnerHTML={{ __html: para }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Banners */}
          {reached35 && phase === "writing" && (
            <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm font-medium text-sky-700 dark:text-sky-300">
              35 minutes reached — {wordsAt35} words recorded at this point. Keep writing if
              there&apos;s more to say, then hit Submit when ready.
            </div>
          )}
          {phase === "submitted" && (
            <div className="rounded-lg border border-incorrect/40 bg-incorrect/10 p-3 text-sm font-medium text-incorrect">
              Response submitted and locked. See the summary below.
            </div>
          )}

          {/* Summary */}
          {phase === "submitted" && (
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                Result summary
              </h3>
              {(
                [
                  [
                    "Words at 35:00",
                    reached35 ? `${wordsAt35} words` : "Submitted before 35:00 was reached",
                  ],
                  ["Final word count", `${words} words`],
                  [
                    "Total time used",
                    `${fmt(elapsed)}${overtime ? ` (35:00 + ${fmt(elapsed - DURATION)} overtime)` : ""}`,
                  ],
                  ["Average pace", `${wpm} words/min`],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-dashed border-border py-1 font-mono text-sm last:border-none"
                >
                  <span className="text-muted">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reward */}
          {reward && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-center">
              <div className="mb-1 text-lg tracking-widest">
                {"★".repeat(reward.stars)}
                <span className="text-muted">{"★".repeat(5 - reward.stars)}</span>
              </div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {reward.title}
              </p>
              <p className="text-xs text-muted">{reward.sub}</p>
            </div>
          )}

          {/* Feedback */}
          {phase === "submitted" && (
            <FeedbackPanel
              state={feedback}
              responseText={submittedTextRef.current}
              onRetryScore={() => void runScore()}
              onRetryDetail={() => {
                setFeedback((f) => ({ ...f, detail: null, detailError: null }));
                void runDetail();
              }}
              onOpenLogs={() => void runDetail()}
            />
          )}

          {/* Writing area — fills remaining height */}
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-10 w-px bg-rose-400/40"
            />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={phase !== "writing"}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder={
                phase === "idle"
                  ? "Writing unlocks once you press Start…"
                  : "Write your response here…"
              }
              className="h-full min-h-[42vh] w-full resize-none rounded-lg border border-border bg-background p-4 pl-12 font-serif text-base leading-[30px] outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-100"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 29px, var(--border) 29px, var(--border) 30px)",
                backgroundAttachment: "local",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Keyboard dock ───────────────────────────────────────────────── */}
      <div className="border-t border-border bg-background px-3 py-2 sm:px-4">
        <div className="mx-auto max-w-3xl">
          <OnScreenKeyboard targetRef={textareaRef} />
        </div>
      </div>

      {customOpen && (
        <CustomTaskDialog
          genre={genre}
          onClose={() => setCustomOpen(false)}
          onApply={(title, body) => {
            setCustomPrompt({
              title: title || "Custom task",
              body: [escapeHtml(body).replace(/\n/g, "<br>")],
            });
            setCustomOpen(false);
          }}
        />
      )}

      <HistoryModal
        key={historyOpen ? `${historyView}-open` : "closed"}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        slug={slug}
        history={history}
        onHistoryChange={setHistory}
        activeGenre={genre}
        onRetest={applyRetest}
        initialView={historyView}
      />
    </div>
  );
}

function CustomTaskDialog({
  genre,
  onClose,
  onApply,
}: {
  genre: WritingGenre;
  onClose: () => void;
  onApply: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Custom task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface"
          >
            Close
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          Replaces the {genre} task with your own prompt.
        </p>
        <label className="mb-1 block text-xs font-bold text-muted">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Broken Bike"
          className="mb-3 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
        />
        <label className="mb-1 block text-xs font-bold text-muted">Your prompt</label>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(false);
          }}
          placeholder="Type the task description to write to…"
          className="min-h-[100px] w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm"
        />
        {error && (
          <p className="mt-1.5 text-xs text-incorrect">Please type a prompt before using it.</p>
        )}
        <button
          type="button"
          onClick={() => {
            if (!body.trim()) {
              setError(true);
              return;
            }
            onApply(title.trim(), body.trim());
          }}
          className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Use this task
        </button>
      </div>
    </div>
  );
}
