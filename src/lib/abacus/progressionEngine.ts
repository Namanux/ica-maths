// Pure progression logic — no UI, no Supabase calls, no side effects.

export type SessionOutcome = {
  accuracy: number; // 0-100 (percentage correct)
  avgResponseTimeMs: number; // average time taken per question in milliseconds
  speedSeconds: number; // the time limit that was active this session
  accuracyThreshold: number; // teacher-set threshold (default 100)
};

export type ProgressionResult = {
  newContentBlock: number;
  newSpeedSeconds: number;
  newDisplayLevel: number; // always = currentDisplayLevel + 1
  speedIncreased: boolean;
  contentIncreased: boolean;
  timerReset: boolean;
  reason: string; // human-readable explanation for admin log
};

// The full curriculum design goes to 20, but only blocks 1-9 (Level 1 + 2)
// have real question content built — see getContentSource below. Capping
// auto-advancement here prevents a fast/accurate student from ever being
// served the placeholder "coming soon" questions for blocks 10-20; raise
// this once those blocks have real content.
const MAX_AUTO_CONTENT_BLOCK = 9;
const SPEED_LADDER = [15, 12, 9, 6] as const;

const CONTENT_BLOCK_NAMES: Record<number, string> = {
  1: "Numbers 1–4",
  2: "Numbers 5–9",
  3: "Numbers to 99",
  4: "Place Value",
  5: "Direct Addition",
  6: "Small Friends Addition (+5)",
  7: "Big Friends Addition (+10)",
  8: "Mixed Addition",
  9: "Multi-digit Addition",
  10: "Direct Subtraction",
  11: "Small Friends Subtraction",
  12: "Big Friends Subtraction",
  13: "Mixed Subtraction",
  14: "Mixed Operations",
  15: "Multiplication",
  16: "Division",
  17: "Guided Anzan",
  18: "Semi-Anzan",
  19: "Full Anzan",
  20: "Speed Anzan",
};

export function getNextSpeedStep(current: number): number {
  const idx = SPEED_LADDER.indexOf(current as (typeof SPEED_LADDER)[number]);
  if (idx === -1 || idx === SPEED_LADDER.length - 1) return 6;
  return SPEED_LADDER[idx + 1];
}

export function isFastLearner(avgResponseTimeMs: number, speedSeconds: number): boolean {
  return avgResponseTimeMs < 6000 && speedSeconds >= 12;
}

export function getContentBlockName(id: number): string {
  return CONTENT_BLOCK_NAMES[id] ?? `Block ${id}`;
}

// Content blocks 1-9 are the only ones with real question content today
// (blocks 1-4 = Level 1's lessons, 5-9 = Level 2's) — everything above that
// falls back to the existing placeholder generator until it's built out.
export function getContentSource(contentBlock: number): { level: number; lesson: number } {
  if (contentBlock >= 1 && contentBlock <= 4) return { level: 1, lesson: contentBlock };
  if (contentBlock >= 5 && contentBlock <= 9) return { level: 2, lesson: contentBlock - 4 };
  return { level: 3, lesson: 1 };
}

export function calculateNextPosition(
  currentContentBlock: number,
  currentSpeedSeconds: number,
  currentDisplayLevel: number,
  outcome: SessionOutcome
): ProgressionResult {
  const newDisplayLevel = currentDisplayLevel + 1;

  // Rule 1 — did not reach the accuracy threshold.
  if (outcome.accuracy < outcome.accuracyThreshold) {
    return {
      newContentBlock: currentContentBlock,
      newSpeedSeconds: currentSpeedSeconds,
      newDisplayLevel,
      speedIncreased: false,
      contentIncreased: false,
      timerReset: false,
      reason: "Accuracy below threshold — repeating same content and speed",
    };
  }

  // Rule 2 — fast learner shortcut (checked before rule 3).
  if (isFastLearner(outcome.avgResponseTimeMs, outcome.speedSeconds)) {
    const newContentBlock = Math.min(currentContentBlock + 1, MAX_AUTO_CONTENT_BLOCK);
    return {
      newContentBlock,
      newSpeedSeconds: 15,
      newDisplayLevel,
      speedIncreased: false,
      contentIncreased: newContentBlock !== currentContentBlock,
      timerReset: true,
      reason: "Fast learner detected — skipping to next content block",
    };
  }

  // Rule 4 — mastered at 6s, content advances.
  if (outcome.speedSeconds === 6) {
    const newContentBlock = Math.min(currentContentBlock + 1, MAX_AUTO_CONTENT_BLOCK);
    return {
      newContentBlock,
      newSpeedSeconds: 15,
      newDisplayLevel,
      speedIncreased: false,
      contentIncreased: newContentBlock !== currentContentBlock,
      timerReset: true,
      reason: "Content mastered — advancing to next content block, timer reset",
    };
  }

  // Rule 3 — speed increases.
  return {
    newContentBlock: currentContentBlock,
    newSpeedSeconds: getNextSpeedStep(outcome.speedSeconds),
    newDisplayLevel,
    speedIncreased: true,
    contentIncreased: false,
    timerReset: false,
    reason: "100% accuracy — increasing speed",
  };
}
