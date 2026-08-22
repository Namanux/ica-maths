"use client";

import { useEffect, useState } from "react";
import { getAllFlags, dismissFlag, type QuestionFlag } from "@/lib/flags";
import { getProfile } from "@/lib/profiles";
import { formatCompletedAt } from "@/lib/format";

export function FlaggedQuestionsPanel() {
  const [flags, setFlags] = useState<QuestionFlag[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllFlags().then((data) => {
      if (!cancelled) {
        setFlags(data);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = async (id: string) => {
    await dismissFlag(id);
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  if (!loaded || flags.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Flagged questions</h2>
      <div className="flex flex-col gap-2">
        {flags.map((f) => (
          <div
            key={f.id}
            className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {f.paperTitle} — Question {f.questionNumber}
              </span>
              <button
                onClick={() => handleDismiss(f.id)}
                className="rounded-full border border-incorrect text-incorrect px-3 py-1 text-xs font-medium hover:bg-incorrect/10 transition-colors shrink-0"
              >
                Dismiss
              </button>
            </div>
            {f.note && <p className="text-muted">{f.note}</p>}
            <span className="text-xs text-muted">
              {getProfile(f.profileSlug)?.name ?? f.profileSlug} · {formatCompletedAt(f.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
