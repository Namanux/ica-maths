"use client";

import { useState } from "react";
import { CategoryProgressChart } from "@/components/CategoryProgressChart";
import { MarksLostChart } from "@/components/MarksLostChart";
import { CategoryRankingBars } from "@/components/CategoryRankingBars";
import type { StoredAttempt } from "@/lib/attempts";

type Tab = "progress" | "lost";

export function ProfilePerformanceTabs({
  title,
  attempts,
}: {
  /** Omit to skip the name label — e.g. when a profile picker above already shows it. */
  title?: string;
  /** Must already be sorted oldest -> newest. */
  attempts: StoredAttempt[];
}) {
  const [tab, setTab] = useState<Tab>("progress");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("progress")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "progress"
              ? "bg-accent text-background"
              : "border border-border hover:bg-surface"
          }`}
        >
          Progress by category
        </button>
        <button
          onClick={() => setTab("lost")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "lost"
              ? "bg-accent text-background"
              : "border border-border hover:bg-surface"
          }`}
        >
          Marks left on the table
        </button>
      </div>

      {tab === "progress" ? (
        <>
          <CategoryProgressChart title={title} attempts={attempts} />
          <CategoryRankingBars
            attempts={attempts}
            metric="correctPct"
            title="Average score per category (best to worst)"
          />
        </>
      ) : (
        <>
          <MarksLostChart title={title} attempts={attempts} />
          <CategoryRankingBars
            attempts={attempts}
            metric="lostPct"
            title="Average marks lost per paper (weighted)"
          />
        </>
      )}
    </div>
  );
}
