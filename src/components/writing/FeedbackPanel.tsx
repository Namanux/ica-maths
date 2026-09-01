"use client";

import { useMemo, useState } from "react";
import {
  SCORE_KEYS,
  SCORE_LABELS,
  computeTotal,
  type AnnotationType,
  type DetailedReport,
} from "@/lib/icas-writing-history";
import type { RewriteResult, ScoreResult } from "./feedbackClient";

const ANNOT_STYLE: Record<AnnotationType, string> = {
  spelling: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  grammar: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  punctuation: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  originality: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  strength: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  technique: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
};

const ANNOT_LEGEND: { type: AnnotationType; label: string }[] = [
  { type: "spelling", label: "Spelling" },
  { type: "grammar", label: "Grammar" },
  { type: "punctuation", label: "Punctuation / capitals" },
  { type: "originality", label: "Originality note" },
  { type: "technique", label: "Word choice / technique" },
  { type: "strength", label: "Nice touch" },
];

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-4 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
      {children}
    </h4>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-24 overflow-hidden rounded-full bg-surface">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </span>
      <span className="w-9 text-right font-mono text-xs font-bold">{value}/5</span>
    </span>
  );
}

export function ScoreGrid({ scores }: { scores: Record<string, number> }) {
  const total = computeTotal(scores);
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
        {SCORE_KEYS.map((k) => (
          <div key={k} className="contents">
            <span className="text-sm">{SCORE_LABELS[k]}</span>
            <ScoreBar value={Math.max(0, Math.min(5, scores[k] ?? 0))} />
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-dashed border-border pt-2 font-mono text-sm font-bold">
        Overall: {total} / 25
      </div>
    </>
  );
}

/** Highlights each annotation quote inline within the response text. */
function AnnotatedResponse({
  text,
  annotations,
}: {
  text: string;
  annotations: DetailedReport["annotations"];
}) {
  const { nodes, notes } = useMemo(() => {
    const found: {
      start: number;
      end: number;
      type: AnnotationType;
      note: string;
      quote: string;
    }[] = [];
    (annotations ?? []).forEach((a) => {
      if (!a.quote) return;
      const idx = text.indexOf(a.quote);
      if (idx === -1) return;
      found.push({ start: idx, end: idx + a.quote.length, ...a });
    });
    found.sort((a, b) => a.start - b.start);

    const parts: React.ReactNode[] = [];
    const noteList: { n: number; note: string }[] = [];
    let cursor = 0;
    let counter = 0;
    found.forEach((f, i) => {
      if (f.start < cursor) return;
      if (f.start > cursor) parts.push(text.slice(cursor, f.start));
      counter += 1;
      noteList.push({ n: counter, note: f.note });
      parts.push(
        <span key={`a-${i}`} className={`rounded-sm px-1 ${ANNOT_STYLE[f.type]}`}>
          {f.quote}
          <sup className="ml-0.5 text-[10px]">{counter}</sup>
        </span>,
      );
      cursor = f.end;
    });
    parts.push(text.slice(cursor));
    return { nodes: parts, notes: noteList };
  }, [text, annotations]);

  return (
    <>
      <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface/40 p-4 font-serif text-[15px] leading-loose">
        {nodes}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
        {ANNOT_LEGEND.map((l) => (
          <span key={l.type} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={`h-2.5 w-2.5 rounded-sm ${ANNOT_STYLE[l.type].split(" ")[0]}`} />
            {l.label}
          </span>
        ))}
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notes.map((nt) => (
            <li key={nt.n} className="flex gap-2 text-sm">
              <span className="font-bold">{nt.n}</span>
              <span>{nt.note}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function DetailedReportView({
  report,
  responseText,
}: {
  report: DetailedReport;
  responseText: string;
}) {
  const sv = report.sentenceVariety;
  const maxV = sv ? Math.max(sv.simple, sv.compound, sv.complex, 1) : 1;

  return (
    <div className="flex flex-col gap-1">
      {report.quickGuide && (
        <div className="rounded-lg border border-correct/40 bg-correct/10 p-3">
          <SectionTitle>Quick guide — how to score better next time</SectionTitle>
          <p className="text-sm">{report.quickGuide}</p>
        </div>
      )}

      <SectionTitle>Response</SectionTitle>
      <AnnotatedResponse text={responseText} annotations={report.annotations} />

      {report.miniLessons && report.miniLessons.length > 0 && (
        <>
          <SectionTitle>Quick tutorial — the rules behind today&apos;s mistakes</SectionTitle>
          <div className="flex flex-col gap-2">
            {report.miniLessons.map((l, i) => (
              <div
                key={i}
                className="rounded-lg border border-border border-l-2 border-l-amber-500 bg-surface/40 p-3"
              >
                <p className="text-[13px] font-bold text-amber-700 dark:text-amber-300">
                  {l.title}
                </p>
                <p className="text-[13px]">{l.rule}</p>
                {l.example && (
                  <p className="mt-1 text-xs italic text-muted">{l.example}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {report.sentenceStarters &&
        report.sentenceStarters.repeated.length > 0 && (
          <>
            <SectionTitle>Sentence-starter variety</SectionTitle>
            <div className="rounded-lg border border-border bg-surface/40 p-3">
              <p className="mb-1 text-sm">
                Repeated openers:{" "}
                {report.sentenceStarters.repeated.map((w) => (
                  <span
                    key={w}
                    className="mr-1.5 inline-block rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300"
                  >
                    {w}
                  </span>
                ))}
              </p>
              <p className="text-[13px] text-muted">{report.sentenceStarters.note}</p>
            </div>
          </>
        )}

      {report.modelRewrite?.original && (
        <>
          <SectionTitle>Model rewrite — strengthening the weakest sentence</SectionTitle>
          <div className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
            <p className="mb-1">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">
                Original
              </span>
              <span className="text-rose-700 dark:text-rose-300">
                {report.modelRewrite.original}
              </span>
            </p>
            <p>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">
                Improved
              </span>
              <span className="text-emerald-700 dark:text-emerald-300">
                {report.modelRewrite.improved}
              </span>
            </p>
            {report.modelRewrite.why && (
              <p className="mt-1.5 text-xs text-muted">{report.modelRewrite.why}</p>
            )}
          </div>
        </>
      )}

      {report.techniqueChecklist && report.techniqueChecklist.length > 0 && (
        <>
          <SectionTitle>Descriptive &amp; storytelling technique checklist</SectionTitle>
          <ul className="space-y-1.5 text-[13px]">
            {report.techniqueChecklist.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`font-bold ${
                    t.used ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                  }`}
                >
                  {t.used ? "✓" : "–"}
                </span>
                <span>
                  <span className="font-semibold">{t.technique}</span> — {t.note}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {sv && (
        <>
          <SectionTitle>Sentence type variety</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {(["simple", "compound", "complex"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted capitalize">{k}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-sky-500"
                    style={{ width: `${(sv[k] / maxV) * 100}%` }}
                  />
                </span>
                <span>{sv[k]}</span>
              </div>
            ))}
          </div>
          {sv.note && <p className="mt-1 text-[13px] text-muted">{sv.note}</p>}
        </>
      )}

      {report.stretchTips && report.stretchTips.length > 0 && (
        <div className="mt-3 rounded-lg border border-violet-500/30 border-l-2 border-l-violet-500 bg-violet-500/10 p-3">
          <SectionTitle>Reach further — Year 7-level stretch tips</SectionTitle>
          <Bullets items={report.stretchTips} />
        </div>
      )}

      {report.nextIdeas && report.nextIdeas.length > 0 && (
        <div className="mt-3 rounded-lg border border-sky-500/30 border-l-2 border-l-sky-500 bg-sky-500/10 p-3">
          <SectionTitle>Ideas to try before next practice</SectionTitle>
          <Bullets items={report.nextIdeas} />
        </div>
      )}

      {report.aiRewrite?.rewrite && (
        <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
          <SectionTitle>AI rewrite — aiming for 25/25</SectionTitle>
          <p className="mb-2 text-[11px] italic text-muted">
            Keeps the student&apos;s own ideas and characters — shows what a fully corrected
            version could look like. Not an official score.
          </p>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface/40 p-4 font-serif text-[15px] leading-loose">
            {report.aiRewrite.rewrite}
          </div>
          {report.aiRewrite.changesSummary?.length > 0 && (
            <>
              <SectionTitle>What changed</SectionTitle>
              <Bullets items={report.aiRewrite.changesSummary} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface FeedbackState {
  scoreLoading: boolean;
  score: ScoreResult | null;
  scoreError: string | null;
  detailLoading: boolean;
  detail: DetailedReport | null;
  detailError: string | null;
  rewriteLoading: boolean;
  rewriteError: string | null;
}

export function FeedbackPanel({
  state,
  responseText,
  onRetryScore,
  onRetryDetail,
  onOpenLogs,
}: {
  state: FeedbackState;
  responseText: string;
  onRetryScore: () => void;
  onRetryDetail: () => void;
  onOpenLogs: () => void;
}) {
  const [tab, setTab] = useState<"summary" | "logs">("summary");
  const tabsReady = state.score != null;

  const mergedDetail: DetailedReport | null = state.detail
    ? state.rewriteError && !state.detail.aiRewrite
      ? { ...state.detail }
      : state.detail
    : null;

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">
        AI feedback — scored against ICAS&apos;s real 3-domain framework (Genre, Textual
        Grammar, Syntax/Punctuation)
      </h3>
      <p className="mt-1 text-[11px] italic text-muted">
        ICAS doesn&apos;t publish its exact score-point descriptors, so this is a close
        approximation using its official public framework — not an official ICAS score.
      </p>

      {state.scoreLoading && (
        <p className="mt-3 text-sm italic text-muted">
          Reading the response and scoring it against ICAS-style criteria…
        </p>
      )}

      {state.scoreError && !state.scoreLoading && (
        <div className="mt-3 text-sm">
          <p className="text-incorrect">{state.scoreError}</p>
          <button
            type="button"
            onClick={onRetryScore}
            className="mt-2 rounded-full border border-border px-4 py-1.5 font-medium hover:bg-surface"
          >
            Try again
          </button>
        </div>
      )}

      {tabsReady && (
        <>
          <div className="mt-3 flex gap-1 border-b border-border">
            {(["summary", "logs"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  if (t === "logs") onOpenLogs();
                }}
                className={`-mb-px border-b-2 px-1 pb-2.5 pt-2 text-[13px] font-semibold capitalize ${
                  tab === t
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t === "logs" ? "Logs" : "Summary"}
              </button>
            ))}
          </div>

          {tab === "summary" && state.score && (
            <div className="mt-3 flex flex-col gap-1">
              <ScoreGrid scores={state.score.scores} />
              {state.score.strengths.length > 0 && (
                <>
                  <SectionTitle>What&apos;s working well</SectionTitle>
                  <Bullets items={state.score.strengths} />
                </>
              )}
              {state.score.tips.length > 0 && (
                <>
                  <SectionTitle>Tips to improve</SectionTitle>
                  <Bullets items={state.score.tips} />
                </>
              )}
            </div>
          )}

          {tab === "logs" && (
            <div className="mt-3">
              {state.detailLoading && (
                <p className="text-sm italic text-muted">
                  Marking up mistakes, checking sentence variety, and preparing a model
                  rewrite…
                </p>
              )}
              {state.detailError && !state.detailLoading && (
                <div className="text-sm">
                  <p className="text-incorrect">{state.detailError}</p>
                  <button
                    type="button"
                    onClick={onRetryDetail}
                    className="mt-2 rounded-full border border-border px-4 py-1.5 font-medium hover:bg-surface"
                  >
                    Retry
                  </button>
                </div>
              )}
              {mergedDetail && !state.detailLoading && (
                <>
                  <DetailedReportView report={mergedDetail} responseText={responseText} />
                  {state.rewriteLoading && (
                    <p className="mt-3 text-sm italic text-muted">
                      Generating an AI rewrite aiming for 25/25…
                    </p>
                  )}
                  {state.rewriteError && !state.rewriteLoading && !mergedDetail.aiRewrite && (
                    <p className="mt-3 text-sm text-incorrect">{state.rewriteError}</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { RewriteResult, ScoreResult };
