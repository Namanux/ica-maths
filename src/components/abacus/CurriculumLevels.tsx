"use client";

import Link from "next/link";
import { isLevelUnlocked, type CurriculumLevel } from "@/lib/abacus/curriculum";

export function CurriculumLevels({
  levels,
  profileSlug,
  contentBlock,
}: {
  levels: CurriculumLevel[];
  profileSlug: string;
  contentBlock: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {levels.map((level) => {
        const unlocked = isLevelUnlocked(level.level, contentBlock);

        if (unlocked) {
          return (
            <Link
              key={level.level}
              href={`/${profileSlug}/abacus/level/${level.level}`}
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-surface transition-colors"
            >
              <div>
                <div className="font-medium">
                  Level {level.level} · {level.title}
                </div>
                <div className="text-sm text-muted mt-0.5">{level.description}</div>
              </div>
              <span aria-hidden className="text-muted">
                →
              </span>
            </Link>
          );
        }

        return (
          <button
            key={level.level}
            type="button"
            onClick={() => window.alert("Complete the previous level first")}
            className="flex items-center justify-between rounded-lg border border-border p-4 text-left opacity-50 cursor-not-allowed"
          >
            <div>
              <div className="font-medium">
                Level {level.level} · {level.title}
              </div>
              <div className="text-sm text-muted mt-0.5">{level.description}</div>
            </div>
            <span aria-hidden className="text-muted">
              🔒
            </span>
          </button>
        );
      })}
    </div>
  );
}
