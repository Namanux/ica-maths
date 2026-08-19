"use client";

import { useEffect, useState } from "react";
import { getLocalAttempts, type StoredAttempt } from "@/lib/attempts";

export function RecentAttempts() {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
    setAttempts(getLocalAttempts());
  }, []);

  if (attempts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Recent attempts</h2>
      <div className="flex flex-col gap-2">
        {attempts.slice(0, 5).map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm"
          >
            <span>{a.paperTitle}</span>
            <span className="text-muted">
              {a.score}/{a.totalQuestions} ({a.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
