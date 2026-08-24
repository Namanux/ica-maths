"use client";

import { useEffect, useState } from "react";
import { getAttempts, type StoredAttempt } from "@/lib/attempts";
import { getProfile, PROFILES } from "@/lib/profiles";
import { CategoryProgressChart } from "@/components/CategoryProgressChart";

export function CategoryProgressPanel({ profileSlug }: { profileSlug: string }) {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const isAdmin = getProfile(profileSlug)?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    getAttempts(profileSlug, isAdmin).then((data) => {
      if (!cancelled) {
        setAttempts(data);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileSlug, isAdmin]);

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
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Progress by category</h2>
      <div className="flex flex-col gap-4">
        {orderedSlugs.map((slug) => (
          <CategoryProgressChart
            key={slug}
            title={isAdmin ? (getProfile(slug)?.name ?? slug) : "Your progress"}
            attempts={byProfile.get(slug)!}
          />
        ))}
      </div>
    </div>
  );
}
