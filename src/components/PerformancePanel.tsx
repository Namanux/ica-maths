"use client";

import { useEffect, useState } from "react";
import { getAttempts, type StoredAttempt } from "@/lib/attempts";
import { getProfile, PROFILES } from "@/lib/profiles";
import { getPaperById, paperExam } from "@/lib/papers";
import { ProfilePerformanceTabs } from "@/components/ProfilePerformanceTabs";

export function PerformancePanel({
  profileSlug,
  exam,
}: {
  profileSlug: string;
  /** When set, only attempts on papers from this exam section are counted. */
  exam?: string;
}) {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const isAdmin = getProfile(profileSlug)?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    getAttempts(profileSlug, isAdmin).then((data) => {
      if (!cancelled) {
        const filtered = exam
          ? data.filter((a) => {
              const paper = getPaperById(a.paperId);
              return paper ? paperExam(paper) === exam : false;
            })
          : data;
        setAttempts(filtered);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileSlug, isAdmin, exam]);

  if (!loaded || attempts.length === 0) return null;

  const byProfile = new Map<string, StoredAttempt[]>();
  for (const a of attempts) {
    const list = byProfile.get(a.profileSlug) ?? [];
    list.push(a);
    byProfile.set(a.profileSlug, list);
  }
  for (const list of byProfile.values()) {
    list.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  }

  const orderedSlugs = PROFILES.map((p) => p.slug).filter((s) => byProfile.has(s));

  return (
    <div className="flex flex-col gap-6">
      {orderedSlugs.map((slug) => (
        <ProfilePerformanceTabs
          key={slug}
          title={isAdmin ? (getProfile(slug)?.name ?? slug) : "Your progress"}
          attempts={byProfile.get(slug)!}
        />
      ))}
    </div>
  );
}
