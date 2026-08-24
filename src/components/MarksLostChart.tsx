"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TOPIC_ORDER } from "@/lib/scoring";
import { TOPIC_COLORS, TOPIC_COLORS_DARK } from "@/lib/topicColors";
import { useTheme } from "@/lib/theme-provider";
import { formatShortDate } from "@/lib/format";
import type { StoredAttempt } from "@/lib/attempts";

interface ChartPoint {
  label: string;
  totalLostPct: number;
  raw: Record<string, { correct: number; total: number }>;
  [topic: string]: unknown;
}

/**
 * Weighted loss: how many percentage points of the WHOLE paper each
 * category cost you, i.e. (questions missed in that category) / (total
 * questions on that paper) — generalised from a fixed /40, since papers
 * in this app range from 12 to 40 questions.
 */
function buildChartData(attempts: StoredAttempt[]): ChartPoint[] {
  return attempts.map((a) => {
    const point: ChartPoint = {
      label: formatShortDate(a.completedAt),
      totalLostPct: 0,
      raw: {},
    };
    let totalLost = 0;
    for (const topic of TOPIC_ORDER) {
      const cat = a.categoryBreakdown.find((c) => c.topic === topic);
      if (cat && cat.total > 0) {
        const lostPct = ((cat.total - cat.correct) / a.totalQuestions) * 100;
        point[topic] = Math.round(lostPct * 10) / 10;
        point.raw[topic] = { correct: cat.correct, total: cat.total };
        totalLost += lostPct;
      }
    }
    point.totalLostPct = Math.round(totalLost * 10) / 10;
    return point;
  });
}

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = (payload[0] as unknown as { payload: ChartPoint }).payload;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg flex flex-col gap-1">
      <div className="font-medium">{label}</div>
      {payload.map((entry) => {
        const raw = point.raw[entry.dataKey];
        return (
          <div key={entry.dataKey} className="flex items-center gap-1.5" style={{ color: entry.color }}>
            <span>{entry.dataKey}:</span>
            {raw && (
              <span>
                {raw.total - raw.correct}/{raw.total} missed
              </span>
            )}
            <span>({entry.value}%)</span>
          </div>
        );
      })}
      <div className="pt-1 mt-1 border-t border-border font-medium text-foreground">
        Total lost: {point.totalLostPct}%
      </div>
    </div>
  );
}

export function MarksLostChart({ title, attempts }: { title: string; attempts: StoredAttempt[] }) {
  const { theme } = useTheme();
  const palette = theme === "dark" ? TOPIC_COLORS_DARK : TOPIC_COLORS;
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (attempts.length < 2) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm">
        <div className="font-medium mb-1">{title}</div>
        <p className="text-muted">Complete at least 2 papers to see this chart.</p>
      </div>
    );
  }

  const data = buildChartData(attempts);
  const topicsPresent = TOPIC_ORDER.filter((t) => data.some((d) => typeof d[t] === "number"));

  const toggleTopic = (topic: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-xs text-muted mt-0.5">
          % of paper marks lost per category — lower is better
        </p>
      </div>
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--border)" />
            <YAxis
              domain={[0, 30]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              stroke="var(--border)"
              label={{
                value: "% of paper lost",
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
                fontSize: 11,
              }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              onClick={(entry) => toggleTopic(String(entry.dataKey))}
              wrapperStyle={{ cursor: "pointer", fontSize: 12 }}
            />
            {topicsPresent.map((topic) => (
              <Line
                key={topic}
                type="monotone"
                dataKey={topic}
                stroke={palette[topic]?.text ?? "var(--foreground)"}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                hide={hidden.has(topic)}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
