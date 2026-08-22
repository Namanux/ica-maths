"use client";

import { useState } from "react";
import { reportIssue } from "@/lib/flags";

export function ReportIssueButton({
  paperId,
  paperTitle,
  questionId,
  questionNumber,
  profileSlug,
}: {
  paperId: string;
  paperTitle: string;
  questionId: string;
  questionNumber: number;
  profileSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  if (status === "sent") {
    return <p className="text-xs text-muted">Thanks — this question has been flagged for review.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-xs text-muted underline hover:text-foreground transition-colors"
      >
        Report an issue with this question
      </button>
    );
  }

  const submit = async () => {
    setStatus("sending");
    await reportIssue({
      paperId,
      paperTitle,
      questionId,
      questionNumber,
      profileSlug,
      note: note.trim() || null,
    });
    setStatus("sent");
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's wrong with this question? (optional)"
        rows={2}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={status === "sending"}
          className="rounded-full bg-accent text-background px-4 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Submit report
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
