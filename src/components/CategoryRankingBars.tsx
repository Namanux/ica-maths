"use client";

import { useTheme } from "@/lib/theme-provider";
import { topicsFromAttempts } from "@/lib/scoring";
import { TOPIC_COLORS, TOPIC_COLORS_DARK } from "@/lib/topicColors";
import type { StoredAttempt } from "@/lib/attempts";

interface RankRow {
  topic: string;
  avg: number;
}

function computeRows(attempts: StoredAttempt[], metric: "correctPct" | "lostPct"): RankRow[] {
  return topicsFromAttempts(attempts).map((topic) => {
    const values: number[] = [];
    for (const a of attempts) {
      const cat = a.categoryBreakdown.find((c) => c.topic === topic);
      if (cat && cat.total > 0) {
        values.push(
          metric === "correctPct"
            ? (cat.correct / cat.total) * 100
            : ((cat.total - cat.correct) / a.totalQuestions) * 100
        );
      }
    }
    if (values.length === 0) return null;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return { topic: topic as string, avg };
  })
    .filter((r): r is RankRow => r !== null)
    .sort((a, b) => b.avg - a.avg);
}

export function CategoryRankingBars({
  attempts,
  metric,
  title,
}: {
  attempts: StoredAttempt[];
  metric: "correctPct" | "lostPct";
  title: string;
}) {
  const { theme } = useTheme();
  const palette = theme === "dark" ? TOPIC_COLORS_DARK : TOPIC_COLORS;
  const rows = computeRows(attempts, metric);

  if (rows.length === 0) return null;
  const maxAvg = Math.max(...rows.map((r) => r.avg), 0.001);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="font-medium">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => {
          const color = palette[row.topic]?.text ?? "var(--foreground)";
          const widthPct = (row.avg / maxAvg) * 100;
          return (
            <div key={row.topic} className="flex items-center gap-3">
              <span className="text-xs text-muted w-6 shrink-0">#{i + 1}</span>
              <div className="flex-1 h-3 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-sm font-semibold w-14 shrink-0 text-right" style={{ color }}>
                {row.avg.toFixed(1)}%
              </span>
              <span className="text-sm">{row.topic}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
