"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Subject } from "@/lib/subjects";
import { getProfile } from "@/lib/profiles";
import { reportLiveState } from "@/lib/liveSessions";

const HOVER_DEBOUNCE_MS = 200;

export function SubjectGrid({
  subjects,
  profileSlug,
}: {
  subjects: Subject[];
  profileSlug: string;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any stale hover left over from a previous visit to this page.
    const profile = getProfile(profileSlug);
    if (!profile) return;
    void reportLiveState({
      profileSlug: profile.slug,
      profileName: profile.name,
      hoveredItem: null,
    });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [profileSlug]);

  const setHovered = (name: string | null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const profile = getProfile(profileSlug);
      if (!profile) return;
      void reportLiveState({
        profileSlug: profile.slug,
        profileName: profile.name,
        hoveredItem: name,
      });
    }, HOVER_DEBOUNCE_MS);
  };

  return (
    <div className="flex flex-col gap-3">
      {subjects.map((subject) => (
        <Link
          key={subject.slug}
          href={subject.available ? `/${profileSlug}/${subject.slug}` : `/${subject.slug}`}
          onMouseEnter={() => setHovered(subject.name)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(subject.name)}
          onBlur={() => setHovered(null)}
          className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
        >
          <div>
            <div className="font-medium">{subject.name}</div>
            <div className="text-sm text-muted mt-0.5">{subject.description}</div>
          </div>
          <span aria-hidden className="text-muted">
            {subject.available ? "→" : "Coming soon"}
          </span>
        </Link>
      ))}
    </div>
  );
}
