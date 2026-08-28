"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Paper } from "@/lib/types";
import { getAttemptById, deleteAttempt, type StoredAttempt } from "@/lib/attempts";
import { getProfile } from "@/lib/profiles";
import { paperExam } from "@/lib/papers";
import { ResultsPanel } from "@/components/ResultsPanel";

export function AttemptViewer({
  paper,
  attemptId,
  profileSlug,
}: {
  paper: Paper;
  attemptId: string;
  profileSlug: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<StoredAttempt | null | undefined>(undefined);
  const isAdmin = getProfile(profileSlug)?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    getAttemptById(attemptId).then((data) => {
      if (!cancelled) setAttempt(data);
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (attempt === undefined) {
    return <p className="text-muted">Loading attempt…</p>;
  }

  const goBackToPapers = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${profileSlug}/${paperExam(paper)}`);
    }
  };

  if (attempt === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted">This attempt couldn&apos;t be found — it may have been deleted.</p>
        <button
          onClick={goBackToPapers}
          className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
        >
          Back to papers
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteAttempt(attemptId);
    goBackToPapers();
  };

  return (
    <ResultsPanel
      paper={paper}
      result={attempt}
      mode="historical"
      profileSlug={profileSlug}
      onDelete={isAdmin ? handleDelete : undefined}
    />
  );
}
