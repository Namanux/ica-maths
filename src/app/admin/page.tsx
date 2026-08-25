"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate, logoutAdmin } from "@/components/admin/AdminGate";
import { getAllStudents, type AbacusStudent } from "@/lib/abacus/supabase";
import { formatRelativeDate } from "@/lib/format";

function StudentCard({ student }: { student: AbacusStudent }) {
  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
      <div className="text-lg font-semibold">{student.displayName}</div>
      <div className="text-sm text-muted">{student.contentBlockName}</div>
      <div className="text-sm text-muted">{student.speedSeconds} seconds per question</div>
      <div className="text-sm text-muted">Level {student.displayLevel}</div>
      <div className="flex justify-between text-sm">
        <span>{student.totalXp} XP</span>
        <span>{student.totalSessions} sessions</span>
      </div>
      <div className="text-xs text-muted">
        {student.lastSessionAt ? formatRelativeDate(student.lastSessionAt) : "No sessions yet"}
      </div>
      <Link
        href={`/admin/student/${student.studentId}`}
        className="mt-2 self-start rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface transition-colors"
      >
        View &amp; Manage →
      </Link>
    </div>
  );
}

function Dashboard() {
  const [students, setStudents] = useState<AbacusStudent[] | null>(null);

  useEffect(() => {
    void getAllStudents().then(setStudents);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abacus Admin</h1>
          <p className="text-muted mt-1">Student Progress Overview</p>
        </div>
        <button
          type="button"
          onClick={logoutAdmin}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface transition-colors"
        >
          Logout
        </button>
      </div>

      {students === null ? (
        <p className="text-muted">Loading students…</p>
      ) : students.length === 0 ? (
        <p className="text-muted">No students enrolled yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {students.map((student) => (
            <StudentCard key={student.studentId} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <Dashboard />
    </AdminGate>
  );
}
