"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { PaperSummary } from "@/lib/types";
import { getProfile } from "@/lib/profiles";
import { reportLiveState } from "@/lib/liveSessions";

const HOVER_DEBOUNCE_MS = 200;

export function PaperListLinks({
  papers,
  slug,
}: {
  papers: PaperSummary[];
  slug: string;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any stale hover left over from a previous visit to this page.
    const profile = getProfile(slug);
    if (!profile) return;
    void reportLiveState({
      profileSlug: profile.slug,
      profileName: profile.name,
      hoveredItem: null,
    });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [slug]);

  const setHovered = (title: string | null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const profile = getProfile(slug);
      if (!profile) return;
      void reportLiveState({
        profileSlug: profile.slug,
        profileName: profile.name,
        hoveredItem: title,
      });
    }, HOVER_DEBOUNCE_MS);
  };

  return (
    <div className="flex flex-col gap-3">
      {papers.map((paper) => (
        <Link
          key={paper.id}
          href={`/${slug}/exam/${paper.id}`}
          onMouseEnter={() => setHovered(paper.title)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(paper.title)}
          onBlur={() => setHovered(null)}
          className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
        >
          <div>
            <div className="font-medium">{paper.title}</div>
            <div className="text-sm text-muted mt-0.5">
              Year {paper.yearLevel} · {paper.questionCount} questions ·{" "}
              {paper.timeLimitMinutes} minutes
            </div>
          </div>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
