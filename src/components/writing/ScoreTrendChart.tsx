"use client";

import type { WritingAttempt } from "@/lib/icas-writing-history";

/**
 * Line chart of score trend across attempts. Total (/25) plus the three
 * ICAS domains, drawn as a plain inline SVG that inherits theme colours via
 * currentColor / Tailwind text utilities.
 */

const SERIES: {
  key: string;
  label: string;
  max: number;
  cls: string;
  value: (h: WritingAttempt) => number;
}[] = [
  {
    key: "total",
    label: "Total (/25)",
    max: 25,
    cls: "text-amber-500",
    value: (h) => h.total,
  },
  {
    key: "genre",
    label: "Genre (/10)",
    max: 10,
    cls: "text-emerald-500",
    value: (h) => (h.scores.genreStructure ?? 0) + (h.scores.genreStyle ?? 0),
  },
  {
    key: "grammar",
    label: "Textual grammar (/10)",
    max: 10,
    cls: "text-violet-500",
    value: (h) => (h.scores.grammarTense ?? 0) + (h.scores.grammarCohesion ?? 0),
  },
  {
    key: "syntax",
    label: "Syntax/punctuation (/5)",
    max: 5,
    cls: "text-sky-500",
    value: (h) => h.scores.syntaxPunctuation ?? 0,
  },
];

export function ScoreTrendChart({ history }: { history: WritingAttempt[] }) {
  if (history.length < 2) return null;

  const w = 720;
  const h = 200;
  const padL = 28;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = history.length;

  const xAt = (i: number) => padL + (i * innerW) / (n - 1);
  const yAt = (v: number, max: number) => padT + innerH - (v / max) * innerH;

  const pathFor = (get: (x: WritingAttempt) => number, max: number) =>
    history
      .map((hh, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(get(hh), max).toFixed(1)}`)
      .join(" ");

  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Score trend across attempts
      </h4>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + innerH}
          className="stroke-border"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="stroke-border"
          strokeWidth={1}
        />
        {SERIES.map((s) => (
          <path
            key={s.key}
            d={pathFor(s.value, s.max)}
            fill="none"
            className={s.cls}
            stroke="currentColor"
            strokeWidth={s.key === "total" ? 2.5 : 2}
            opacity={s.key === "total" ? 1 : 0.85}
          />
        ))}
        {history.map((hh, i) => (
          <circle
            key={i}
            cx={xAt(i)}
            cy={yAt(hh.total, 25)}
            r={3}
            className="fill-amber-500"
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={`h-2.5 w-2.5 rounded-sm bg-current ${s.cls}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
