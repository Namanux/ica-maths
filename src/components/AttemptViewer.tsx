"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Paper } from "@/lib/types";
import { getAttemptById, deleteAttempt, type StoredAttempt } from "@/lib/attempts";
import { getProfile } from "@/lib/profiles";
import { ResultsPanel } from "@/components/ResultsPanel";
import Link from "next/link";

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

  if (attempt === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted">This attempt couldn&apos;t be found — it may have been deleted.</p>
        <Link
          href={`/${profileSlug}/icas`}
          className="self-start rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
        >
          Back to papers
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteAttempt(attemptId);
    router.push(`/${profileSlug}/icas`);
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
