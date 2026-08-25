"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import {
  getAllStudents,
  getStudentProgress,
  getStudentSessions,
  updateStudentSettings,
  saveProgressionResult,
  type AbacusProgress,
  type AbacusSession,
} from "@/lib/abacus/supabase";
import { calculateNextPosition, getContentBlockName } from "@/lib/abacus/progressionEngine";
import { getLevelTitle } from "@/lib/abacus/xp";
import { formatCompletedAt } from "@/lib/format";

const SPEED_STEPS = [15, 12, 9, 6];
const CONTENT_BLOCK_IDS = Array.from({ length: 20 }, (_, i) => i + 1);

// Where each curriculum level's content blocks begin (see CURRICULUM in
// curriculum.ts: Level 1 has 4 lessons, Level 2 has 5, and so on).
const LEVEL_START_BLOCKS = [
  { level: 1, block: 1 },
  { level: 2, block: 5 },
  { level: 3, block: 10 },
  { level: 4, block: 14 },
  { level: 5, block: 17 },
];

// A manual "force advance" should behave like a normal — not fast-learner —
// clear, so it always takes exactly one step (speed up, or content advance
// at 6s). Fast learner requires avgResponseTimeMs < 6000, so anything well
// above that keeps this path out of the shortcut rule.
const FORCE_ADVANCE_AVG_RESPONSE_MS = 999_999;

function AccuracyChart({
  sessions,
  threshold,
}: {
  sessions: AbacusSession[];
  threshold: number;
}) {
  const chartSessions = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (chartSessions.length === 0) {
    return <p className="text-muted text-sm">No sessions yet.</p>;
  }

  const width = 520;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 22, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barGap = 4;
  const barWidth = Math.max(chartWidth / chartSessions.length - barGap, 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Accuracy over the last sessions"
    >
      {[0, 50, 100].map((tick) => {
        const y = padding.top + chartHeight - (tick / 100) * chartHeight;
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--muted)">
              {tick}%
            </text>
          </g>
        );
      })}
      {chartSessions.map((session, i) => {
        const x = padding.left + i * (barWidth + barGap);
        const barHeight = Math.max((session.accuracy / 100) * chartHeight, 1);
        const y = padding.top + chartHeight - barHeight;
        const color = session.accuracy >= threshold ? "var(--correct)" : "var(--incorrect)";
        return (
          <g key={session.id}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={1} />
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted)"
            >
              {session.sessionNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StudentDashboard({ studentId }: { studentId: string }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [progress, setProgress] = useState<AbacusProgress | null>(null);
  const [sessions, setSessions] = useState<AbacusSession[]>([]);
  const [contentBlock, setContentBlock] = useState(1);
  const [speedSeconds, setSpeedSeconds] = useState(15);
  const [questionsPerSession, setQuestionsPerSession] = useState(5);
  const [accuracyThreshold, setAccuracyThreshold] = useState(100);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [students, studentProgress, studentSessions] = await Promise.all([
      getAllStudents(),
      getStudentProgress(studentId),
      getStudentSessions(studentId, 20),
    ]);
    setDisplayName(students.find((s) => s.studentId === studentId)?.displayName ?? studentId);
    setProgress(studentProgress);
    setSessions(studentSessions);
    if (studentProgress) {
      setContentBlock(studentProgress.contentBlock);
      setSpeedSeconds(studentProgress.speedSeconds);
      setQuestionsPerSession(studentProgress.questionsPerSession);
      setAccuracyThreshold(studentProgress.accuracyThreshold);
    }
  }, [studentId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await updateStudentSettings(studentId, {
        contentBlock,
        speedSeconds,
        questionsPerSession,
        accuracyThreshold,
      });
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const unlockLevel = async (startBlock: number) => {
    setUnlockingLevel(startBlock);
    try {
      await updateStudentSettings(studentId, { contentBlock: startBlock, speedSeconds: 15 });
      await load();
    } finally {
      setUnlockingLevel(null);
    }
  };

  const forceAdvance = async () => {
    if (!progress) return;
    if (!window.confirm("Are you sure? This will advance the student.")) return;
    setAdvancing(true);
    try {
      const result = calculateNextPosition(
        progress.contentBlock,
        progress.speedSeconds,
        progress.displayLevel,
        {
          accuracy: 100,
          avgResponseTimeMs: FORCE_ADVANCE_AVG_RESPONSE_MS,
          speedSeconds: progress.speedSeconds,
          accuracyThreshold: progress.accuracyThreshold,
        }
      );
      await saveProgressionResult(studentId, result, 0);
      await load();
    } finally {
      setAdvancing(false);
    }
  };

  if (!progress) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
        ← All Students
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
            <div>
              {getContentBlockName(progress.contentBlock)}{" "}
              <span className="text-muted">(Block {progress.contentBlock})</span>
            </div>
            <div className="text-muted">{progress.speedSeconds} seconds per question</div>
            <div className="text-muted">Level {progress.displayLevel}</div>
            <div className="text-muted">
              {progress.totalXp} XP · {getLevelTitle(progress.totalXp)}
            </div>
            <div className="text-muted">{progress.totalSessions} sessions completed</div>
          </div>

          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <span className="text-sm font-semibold tracking-wide uppercase text-muted">
              Accuracy — last {sessions.length} sessions
            </span>
            <AccuracyChart sessions={sessions} threshold={progress.accuracyThreshold} />
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left">
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium">Content</th>
                  <th className="p-2 font-medium">Speed</th>
                  <th className="p-2 font-medium">Score</th>
                  <th className="p-2 font-medium">Accuracy</th>
                  <th className="p-2 font-medium">Avg time</th>
                  <th className="p-2 font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr>
                    <td className="p-2 text-muted" colSpan={7}>
                      No sessions yet.
                    </td>
                  </tr>
                )}
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border last:border-0">
                    <td className="p-2 whitespace-nowrap">{formatCompletedAt(session.completedAt)}</td>
                    <td className="p-2 whitespace-nowrap">{session.contentBlockName}</td>
                    <td className="p-2">{session.speedSeconds}s</td>
                    <td className="p-2 whitespace-nowrap">
                      {session.questionsCorrect}/{session.questionsTotal}
                    </td>
                    <td className="p-2">{Math.round(session.accuracy)}%</td>
                    <td className="p-2">{(session.avgResponseTimeMs / 1000).toFixed(1)}s</td>
                    <td className="p-2">+{session.xpEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 flex flex-col gap-4 h-fit">
          <span className="text-sm font-semibold tracking-wide uppercase text-muted">
            Teacher Controls
          </span>

          <div className="flex flex-col gap-1 text-sm">
            Unlock Level
            <div className="flex flex-wrap gap-2">
              {LEVEL_START_BLOCKS.map(({ level, block }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => void unlockLevel(block)}
                  disabled={unlockingLevel !== null}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    progress.contentBlock >= block
                      ? "border-accent bg-accent text-background"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  {unlockingLevel === block ? "…" : `Level ${level}`}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">
              Jumps straight to that level&apos;s first content block. Levels 3-5 have no
              real questions yet, so they&apos;ll show &quot;Coming soon&quot; if played.
            </span>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Content Block
            <select
              value={contentBlock}
              onChange={(e) => setContentBlock(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {CONTENT_BLOCK_IDS.map((id) => (
                <option key={id} value={id}>
                  {id} – {getContentBlockName(id)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-sm">
            Speed (seconds per question)
            <div className="flex gap-2">
              {SPEED_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setSpeedSeconds(step)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    speedSeconds === step
                      ? "border-accent bg-accent text-background"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  {step}s
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Questions per Session
            <input
              type="number"
              min={3}
              max={20}
              value={questionsPerSession}
              onChange={(e) => setQuestionsPerSession(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Accuracy Threshold to Progress
            <input
              type="number"
              min={50}
              max={100}
              value={accuracyThreshold}
              onChange={(e) => setAccuracyThreshold(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>

          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={saving || advancing}
            className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saved ? "Saved ✓" : "Save Changes"}
          </button>

          <hr className="border-border" />

          <button
            type="button"
            onClick={() => void forceAdvance()}
            disabled={saving || advancing}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors disabled:opacity-50"
          >
            Force Advance to Next Speed/Content
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;

  return (
    <AdminGate>
      <StudentDashboard studentId={studentId} />
    </AdminGate>
  );
}
