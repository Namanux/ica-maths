"use client";

import { useEffect, useState } from "react";
import { getAttempts, deleteAttempt, type StoredAttempt } from "@/lib/attempts";
import { formatDuration, formatCompletedAt } from "@/lib/format";
import Link from "next/link";

export function RecentAttempts() {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAttempts().then((data) => {
      if (!cancelled) {
        setAttempts(data);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this attempt? This can't be undone.")) return;
    await deleteAttempt(id);
    setAttempts((prev) => prev.filter((a) => a.id !== id));
  };

  if (!loaded || attempts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Recent attempts</h2>
      <div className="flex flex-col gap-2">
        {attempts.slice(0, 20).map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{a.paperTitle}</span>
              <span className="text-muted shrink-0">
                {a.score}/{a.totalQuestions} ({a.percentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-muted">
                {formatCompletedAt(a.completedAt)} · Duration {formatDuration(a.timeTakenSeconds)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/exam/${a.paperId}/attempt/${a.id}`}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface transition-colors"
                >
                  View summary
                </Link>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="rounded-full border border-incorrect text-incorrect px-3 py-1 text-xs font-medium hover:bg-incorrect/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
