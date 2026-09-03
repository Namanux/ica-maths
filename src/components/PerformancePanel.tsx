"use client";

import { useEffect, useState } from "react";
import { getAttempts, type StoredAttempt } from "@/lib/attempts";
import { getProfile, PROFILES } from "@/lib/profiles";
import { getPaperById, paperExam } from "@/lib/papers";
import { ProfilePerformanceTabs } from "@/components/ProfilePerformanceTabs";
import { RecentAttempts } from "@/components/RecentAttempts";

export function PerformancePanel({
  profileSlug,
  exam,
  subject,
  paperId,
}: {
  profileSlug: string;
  /** When set, only attempts on papers from this exam section are counted. */
  exam?: string;
  /** When set, only attempts on papers with this exact `subject` are counted. */
  subject?: string;
  /** When set, only attempts on this exact paper are counted. */
  paperId?: string;
}) {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const isAdmin = getProfile(profileSlug)?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    getAttempts(profileSlug, isAdmin).then((data) => {
      if (!cancelled) {
        const filtered = data.filter((a) => {
          if (paperId && a.paperId !== paperId) return false;
          if (exam || subject) {
            const paper = getPaperById(a.paperId);
            if (!paper) return false;
            if (exam && paperExam(paper) !== exam) return false;
            if (subject && paper.subject !== subject) return false;
          }
          return true;
        });
        setAttempts(filtered);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileSlug, isAdmin, exam, subject, paperId]);

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

  // Non-admins only ever see their own attempts (enforced server-side by
  // getAttempts), so there's nothing to pick between — just show their own.
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <ProfilePerformanceTabs title="Your progress" attempts={byProfile.get(profileSlug) ?? attempts} />
        <RecentAttempts profileSlug={profileSlug} exam={exam} subject={subject} paperId={paperId} />
      </div>
    );
  }

  const activeSlug =
    selectedSlug && orderedSlugs.includes(selectedSlug) ? selectedSlug : orderedSlugs[0];

  return (
    <div className="flex flex-col gap-6">
      <select
        value={activeSlug}
        onChange={(e) => setSelectedSlug(e.target.value)}
        className="self-start rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
        aria-label="Student"
      >
        {orderedSlugs.map((s) => (
          <option key={s} value={s}>
            {getProfile(s)?.name ?? s}
          </option>
        ))}
      </select>
      <ProfilePerformanceTabs attempts={byProfile.get(activeSlug) ?? []} />
      <RecentAttempts
        profileSlug={profileSlug}
        exam={exam}
        subject={subject}
        paperId={paperId}
        profileFilter={activeSlug}
      />
    </div>
  );
}
