"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILES } from "@/lib/profiles";
import { SUBJECTS } from "@/lib/subjects";
import { getPaperById, getAllPapers } from "@/lib/papers";
import { isAnswerCorrect } from "@/lib/scoring";
import { formatDuration } from "@/lib/format";
import { subscribeLiveSessions, type LiveSession } from "@/lib/liveSessions";
import { QuestionBody } from "@/components/QuestionBody";
import type { Paper, Question } from "@/lib/types";

const ONLINE_MS = 45_000;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export function LiveDashboard() {
  const [sessions, setSessions] = useState<Record<string, LiveSession>>({});
  const [pinned, setPinned] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const panelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribeLiveSessions((list) => {
      setSessions(Object.fromEntries(list.map((s) => [s.profileSlug, s])));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(tick);
  }, []);

  const roster = useMemo(
    () =>
      PROFILES.filter((p) => p.role !== "admin").map((p) => {
        const session = sessions[p.slug];
        const online = !!session && now - new Date(session.updatedAt).getTime() < ONLINE_MS;
        return { profile: p, session, online };
      }),
    [sessions, now]
  );

  const onlineCount = roster.filter((r) => r.online).length;

  const togglePin = (slug: string) => {
    setPinned((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const watchEveryone = () => {
    setPinned(roster.filter((r) => r.online).map((r) => r.profile.slug));
  };

  const toggleFullscreen = (slug: string) => {
    const el = panelRefs.current.get(slug);
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live activity</h1>
        <p className="text-muted mt-1">
          {onlineCount > 0
            ? `${onlineCount} online now`
            : "No one is online right now — this updates automatically."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {roster.map(({ profile, session, online }) => {
          const isPinned = pinned.includes(profile.slug);
          return (
            <button
              key={profile.slug}
              onClick={() => togglePin(profile.slug)}
              className={`flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 border transition-colors ${
                isPinned ? "border-accent bg-surface" : "border-border hover:bg-surface"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${online ? "bg-correct" : "bg-muted"}`}
                aria-hidden
              />
              <span className="text-sm font-medium">{profile.name}</span>
              <span className="text-xs text-muted">
                {online
                  ? (session?.pageLabel ?? "Online")
                  : session
                  ? `Last seen ${relativeTime(session.updatedAt)}`
                  : "Never opened the app"}
              </span>
            </button>
          );
        })}
        {pinned.length === 0 && onlineCount > 0 && (
          <button
            onClick={watchEveryone}
            className="rounded-full border border-accent text-accent px-3 py-1.5 text-sm font-medium hover:bg-accent/10 transition-colors"
          >
            Watch everyone online
          </button>
        )}
      </div>

      {pinned.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center text-muted text-sm">
          Click a name above to watch their live screen here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pinned.map((slug) => {
            const profile = PROFILES.find((p) => p.slug === slug);
            const session = sessions[slug];
            const online = !!session && now - new Date(session.updatedAt).getTime() < ONLINE_MS;
            if (!profile) return null;
            return (
              <LiveStudentPanel
                key={slug}
                setRef={(el) => {
                  if (el) panelRefs.current.set(slug, el);
                  else panelRefs.current.delete(slug);
                }}
                name={profile.name}
                online={online}
                session={session}
                onUnpin={() => togglePin(slug)}
                onFullscreen={() => toggleFullscreen(slug)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveStudentPanel({
  name,
  online,
  session,
  onUnpin,
  onFullscreen,
  setRef,
}: {
  name: string;
  online: boolean;
  session?: LiveSession;
  onUnpin: () => void;
  onFullscreen: () => void;
  setRef: (el: HTMLDivElement | null) => void;
}) {
  const paper = session?.paperId ? getPaperById(session.paperId) : undefined;
  const liveIndex =
    paper && session?.questionNumber ? session.questionNumber - 1 : null;

  // "live" always follows wherever the kid currently is; "history" pins the
  // view to a question the parent picked, so stepping away and coming back
  // (or just clicking an old question in the map) doesn't get yanked back
  // to whatever the kid is doing right now.
  const [viewMode, setViewMode] = useState<"live" | "history">("live");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  // A new paper (or the kid isn't testing anymore) makes stale history
  // pointless — snap back to following live.
  useEffect(() => {
    setViewMode("live");
    setHistoryIndex(null);
  }, [session?.paperId]);

  const viewingIndex =
    viewMode === "history" && historyIndex !== null ? historyIndex : liveIndex;
  const question =
    paper && viewingIndex !== null ? paper.questions[viewingIndex] : undefined;

  const viewHistory = (i: number) => {
    setHistoryIndex(i);
    setViewMode("history");
  };
  const goLive = () => {
    setViewMode("live");
    setHistoryIndex(null);
  };

  return (
    <div
      ref={setRef}
      className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3 overflow-y-auto [&:fullscreen]:max-w-3xl [&:fullscreen]:mx-auto [&:fullscreen]:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-semibold text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            <p className="text-xs text-muted truncate">
              {online ? (session?.pageLabel ?? "Online") : session ? `Last seen ${relativeTime(session.updatedAt)}` : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {paper && (
            <button
              onClick={viewMode === "live" ? () => viewHistory(liveIndex ?? 0) : goLive}
              aria-pressed={viewMode === "live"}
              title={
                viewMode === "live"
                  ? "Ticked: glued to their live question. Click to untick and browse freely."
                  : "Unticked: browsing history. Click to re-tick and jump back to live."
              }
              className={`rounded-full border pl-1.5 pr-2.5 h-7 flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "live"
                  ? "border-correct text-correct"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[9px] leading-none ${
                  viewMode === "live"
                    ? "border-correct bg-correct text-background"
                    : "border-muted"
                }`}
                aria-hidden
              >
                {viewMode === "live" ? "✓" : ""}
              </span>
              Live
            </button>
          )}
          <button
            onClick={onFullscreen}
            title="Full screen"
            className="rounded-full border border-border h-7 w-7 flex items-center justify-center text-xs hover:bg-surface transition-colors"
          >
            ⤢
          </button>
          <button
            onClick={onUnpin}
            title="Stop watching"
            className="rounded-full border border-border h-7 w-7 flex items-center justify-center text-xs hover:bg-surface transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {!session || !session.paperId ? (
        session?.section === "ICAS" && session.pageLabel === "Choosing a paper" ? (
          <div className="flex flex-col gap-1.5">
            {getAllPapers().map((paper) => {
              const looking = session.hoveredItem === paper.title;
              return (
                <div
                  key={paper.id}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    looking ? "border-accent bg-surface" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{paper.title}</span>
                    {looking && (
                      <span className="text-xs text-accent shrink-0">Looking at this</span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Year {paper.yearLevel} · {paper.questionCount} questions
                  </div>
                </div>
              );
            })}
          </div>
        ) : session?.pageLabel === "Choosing a subject" ? (
          <div className="flex flex-col gap-1.5">
            {SUBJECTS.map((subject) => {
              const looking = session.hoveredItem === subject.name;
              return (
                <div
                  key={subject.slug}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    looking ? "border-accent bg-surface" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{subject.name}</span>
                    {looking && (
                      <span className="text-xs text-accent shrink-0">Looking at this</span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{subject.description}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-surface px-4 py-6 text-center text-sm text-muted">
            Not currently in a test.
          </div>
        )
      ) : session.examStatus === "intro" ? (
        <div className="rounded-lg bg-surface px-4 py-6 text-center text-sm text-muted">
          Reading the instructions for {session.paperTitle}.
        </div>
      ) : (
        <>
          {session.totalQuestions && session.questionNumber && (
            <div>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>
                  {viewMode === "history" && viewingIndex !== null
                    ? `Viewing question ${viewingIndex + 1} of ${session.totalQuestions} — they're on ${session.questionNumber}`
                    : `Question ${session.questionNumber} of ${session.totalQuestions}`}
                </span>
                <span className="flex items-center gap-2">
                  {session.examStatus === "finished" && (
                    <span className="text-correct font-medium">Finished</span>
                  )}
                  {typeof session.secondsLeft === "number" && (
                    <span className="font-mono">{formatDuration(session.secondsLeft)}</span>
                  )}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.round(
                      (session.questionNumber / session.totalQuestions) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {question && (
            <LiveQuestionCard
              question={question}
              userAnswer={session.answers?.[question.id] ?? null}
              studentName={name}
            />
          )}

          {paper && (
            <LiveQuestionMap
              paper={paper}
              answers={session.answers ?? null}
              liveIndex={liveIndex}
              viewingIndex={viewingIndex}
              onSelect={viewHistory}
            />
          )}
        </>
      )}
    </div>
  );
}

// Mirrors the historical attempt-review card (see ResultsPanel's
// ReviewQuestionView) so the parent sees the same layout live: the correct
// option always outlined green (an answer key, parent-only), the kid's pick
// outlined red if it's wrong, and the explanation as a standing hint — none
// of which the kid's own exam screen ever shows.
function LiveQuestionCard({
  question,
  userAnswer,
  studentName,
}: {
  question: Question;
  userAnswer: string | null;
  studentName: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2 text-sm">
      {/* Same prompt/passage/table/image rendering as the kid's own exam
          screen and the historical attempt-review page, so nothing here
          (e.g. a reading passage) is ever missing or drifts out of sync. */}
      <QuestionBody question={question} />

      {question.type === "multiple_choice" && question.options && (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt) => {
            const isUser = userAnswer === opt.label;
            const isCorrectOpt = question.correctAnswer === opt.label;
            let borderColor = "var(--border)";
            if (isCorrectOpt) borderColor = "var(--correct)";
            else if (isUser) borderColor = "var(--incorrect)";
            return (
              <div
                key={opt.label}
                style={{ borderColor }}
                className={`flex items-center gap-2 rounded-md border-2 px-3 py-1.5 ${
                  isCorrectOpt ? "bg-correct/10" : isUser ? "bg-incorrect/10" : ""
                }`}
              >
                <span className="font-mono font-medium text-xs">{opt.label}</span>
                <span className="truncate">{opt.text}</span>
                {isCorrectOpt && (
                  <span className="ml-auto text-xs font-medium shrink-0" style={{ color: "var(--correct)" }}>
                    Correct answer
                  </span>
                )}
                {isUser && !isCorrectOpt && (
                  <span className="ml-auto text-xs font-medium shrink-0" style={{ color: "var(--incorrect)" }}>
                    {studentName} picked this
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {question.type === "free_response" && (
        <div className="flex flex-col gap-1.5">
          <div
            className="rounded-md border-2 px-3 py-1.5 bg-correct/10"
            style={{ borderColor: "var(--correct)" }}
          >
            <span className="font-mono">{question.correctAnswer}</span>
            <span className="ml-2 text-xs font-medium" style={{ color: "var(--correct)" }}>
              Correct answer
            </span>
          </div>
          {userAnswer && !isAnswerCorrect(userAnswer, question) && (
            <div
              className="rounded-md border-2 px-3 py-1.5 bg-incorrect/10"
              style={{ borderColor: "var(--incorrect)" }}
            >
              <span className="font-mono">{userAnswer}</span>
              <span className="ml-2 text-xs font-medium" style={{ color: "var(--incorrect)" }}>
                {studentName}&apos;s answer
              </span>
            </div>
          )}
          {!userAnswer && (
            <p className="text-xs text-muted">No answer yet.</p>
          )}
        </div>
      )}

      {question.explanation && (
        <p className="text-xs text-muted border-t border-border pt-2">
          💡 {question.explanation}
        </p>
      )}
    </div>
  );
}

// Every question, colored by correctness (not just answered/unanswered) and
// clickable — this is the "history" browser: click any past question to
// pin the view there regardless of where the kid currently is.
function LiveQuestionMap({
  paper,
  answers,
  liveIndex,
  viewingIndex,
  onSelect,
}: {
  paper: Paper;
  answers: Record<string, string | null> | null;
  liveIndex: number | null;
  viewingIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {paper.questions.map((q, i) => {
        const ans = answers?.[q.id];
        const answered = ans != null;
        const correct = answered ? isAnswerCorrect(ans, q) : false;
        const isLive = i === liveIndex;
        const isViewing = i === viewingIndex;
        return (
          <button
            key={q.id}
            onClick={() => onSelect(i)}
            title={answered ? (correct ? "Correct" : "Incorrect") : "Not answered yet"}
            style={{
              borderColor: isViewing
                ? "var(--accent)"
                : answered
                ? correct
                  ? "var(--correct)"
                  : "var(--incorrect)"
                : "var(--border)",
              borderWidth: isViewing ? 2 : 1,
              background: answered
                ? correct
                  ? "var(--correct)"
                  : "var(--incorrect)"
                : "transparent",
              color: answered ? "var(--background)" : "var(--foreground)",
            }}
            className="relative h-6 w-6 text-[10px] font-semibold rounded border flex items-center justify-center transition-transform hover:scale-110"
          >
            {q.number}
            {isLive && (
              <span
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent ring-2 ring-background"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
