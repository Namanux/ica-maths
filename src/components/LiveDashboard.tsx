"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILES } from "@/lib/profiles";
import { getPaperById, getAllPapers } from "@/lib/papers";
import { isAnswerCorrect } from "@/lib/scoring";
import { formatDuration } from "@/lib/format";
import { subscribeLiveSessions, type LiveSession } from "@/lib/liveSessions";

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
  const question =
    paper && session?.questionNumber ? paper.questions[session.questionNumber - 1] : undefined;

  return (
    <div
      ref={setRef}
      className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3 overflow-y-auto"
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
                  Question {session.questionNumber} of {session.totalQuestions}
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
            <div className="rounded-lg border border-border p-3 flex flex-col gap-2 text-sm">
              <p className="whitespace-pre-line leading-relaxed">{question.prompt}</p>

              {(question.imageUrl || question.optionsImageUrl) && (
                <div className="flex flex-wrap justify-center items-start gap-2">
                  {question.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.imageUrl}
                      alt=""
                      className="question-image max-w-[48%] max-h-40 w-auto object-contain"
                    />
                  )}
                  {question.optionsImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.optionsImageUrl}
                      alt=""
                      className="question-image max-w-[48%] max-h-40 w-auto object-contain"
                    />
                  )}
                </div>
              )}

              {question.type === "multiple_choice" && question.options && (
                <div className="flex flex-col gap-1.5">
                  {question.options.map((opt) => {
                    const picked = session.lastAnswerLabel === opt.label;
                    const correct = picked && isAnswerCorrect(opt.label, question);
                    return (
                      <div
                        key={opt.label}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${
                          picked
                            ? correct
                              ? "border-correct bg-correct/10"
                              : "border-incorrect bg-incorrect/10"
                            : "border-border"
                        }`}
                      >
                        <span className="font-mono font-medium text-xs">{opt.label}</span>
                        <span className="truncate">{opt.text}</span>
                        {picked && (
                          <span
                            className={`ml-auto text-xs font-medium ${
                              correct ? "text-correct" : "text-incorrect"
                            }`}
                          >
                            {correct ? "Correct" : "Incorrect"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {question.type === "free_response" && (
                <div
                  className={`rounded-md border px-3 py-1.5 ${
                    session.lastAnswerLabel
                      ? session.lastAnswerCorrect
                        ? "border-correct bg-correct/10 text-correct"
                        : "border-incorrect bg-incorrect/10 text-incorrect"
                      : "border-border text-muted"
                  }`}
                >
                  {session.lastAnswerLabel || "No answer yet"}
                </div>
              )}
            </div>
          )}

          {session.answers && paper && (
            <div className="flex flex-wrap gap-1">
              {paper.questions.map((q, i) => {
                const answered = session.answers?.[q.id] != null;
                const isCurrent = i + 1 === session.questionNumber;
                return (
                  <span
                    key={q.id}
                    className={`h-5 w-5 text-[10px] rounded border flex items-center justify-center ${
                      isCurrent
                        ? "border-accent bg-accent text-background"
                        : answered
                        ? "border-border text-blue-600 dark:text-blue-400"
                        : "border-border text-muted"
                    }`}
                  >
                    {q.number}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
