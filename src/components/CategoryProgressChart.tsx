"use client";

import { useTheme } from "@/lib/theme-provider";
import { TOPIC_ORDER } from "@/lib/scoring";
import { TOPIC_COLORS, TOPIC_COLORS_DARK } from "@/lib/topicColors";
import { formatShortDate } from "@/lib/format";
import type { StoredAttempt } from "@/lib/attempts";

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 34, left: 34 };

interface SeriesPoint {
  index: number;
  pct: number;
}

export function CategoryProgressChart({
  title,
  attempts,
}: {
  title: string;
  /** Must already be sorted oldest -> newest. */
  attempts: StoredAttempt[];
}) {
  const { theme } = useTheme();
  const palette = theme === "dark" ? TOPIC_COLORS_DARK : TOPIC_COLORS;

  if (attempts.length < 2) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm">
        <div className="font-medium mb-1">{title}</div>
        <p className="text-muted">Complete at least 2 papers to see a progress trend.</p>
      </div>
    );
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const n = attempts.length;
  const xFor = (i: number) => PAD.left + (innerW * i) / (n - 1);
  const yFor = (pct: number) => PAD.top + innerH - (innerH * pct) / 100;

  const series = TOPIC_ORDER.map((topic) => {
    const points: SeriesPoint[] = [];
    attempts.forEach((a, i) => {
      const cat = a.categoryBreakdown.find((c) => c.topic === topic);
      if (cat && cat.total > 0) {
        points.push({ index: i, pct: Math.round((cat.correct / cat.total) * 100) });
      }
    });
    return { topic, points };
  }).filter((s) => s.points.length > 0);

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
      <div className="font-medium">{title}</div>
      <div className="overflow-x-auto">
        <svg width={WIDTH} height={HEIGHT} className="min-w-[480px]" role="img">
          <title>{`${title} — percentage correct by category over time`}</title>

          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yFor(pct)}
                y2={yFor(pct)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={yFor(pct)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {pct}
              </text>
            </g>
          ))}

          {attempts.map((a, i) => (
            <text
              key={a.id}
              x={xFor(i)}
              y={HEIGHT - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted)"
            >
              {formatShortDate(a.completedAt)}
            </text>
          ))}

          {series.map(({ topic, points }) => {
            const color = palette[topic]?.text ?? "var(--foreground)";
            const path = points.map((p) => `${xFor(p.index)},${yFor(p.pct)}`).join(" ");
            return (
              <g key={topic}>
                <polyline
                  points={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((p) => (
                  <circle key={p.index} cx={xFor(p.index)} cy={yFor(p.pct)} r={3} fill={color}>
                    <title>{`${topic}: ${p.pct}% — ${attempts[p.index].paperTitle}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map(({ topic }) => (
          <span key={topic} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: palette[topic]?.text ?? "var(--foreground)" }}
              aria-hidden
            />
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
