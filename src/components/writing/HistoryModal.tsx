"use client";

import { useEffect, useRef, useState } from "react";
import {
  computePersonalFocus,
  saveHistory,
  SCORE_KEYS,
  SCORE_LABELS,
  type WritingAttempt,
} from "@/lib/icas-writing-history";
import {
  formula,
  QUICK_REMINDERS,
  type WritingGenre,
} from "@/data/icas-writing-prompts";
import { ScoreTrendChart } from "./ScoreTrendChart";
import {
  Bullets,
  DetailedReportView,
  ScoreGrid,
  SectionTitle,
} from "./FeedbackPanel";

type View = "list" | "detail" | "cheat" | "reminders";

const MISTAKE_LABELS: Record<string, string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  punctuation: "Punctuation / capitals",
  technique: "Creative word choice",
};

export interface RetestPayload {
  taskType: WritingGenre;
  taskTitle: string;
  taskBody: string[];
}

export function HistoryModal({
  open,
  onClose,
  slug,
  history,
  onHistoryChange,
  activeGenre,
  onRetest,
  initialView = "list",
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  history: WritingAttempt[];
  onHistoryChange: (next: WritingAttempt[]) => void;
  activeGenre: WritingGenre;
  onRetest: (payload: RetestPayload) => void;
  initialView?: View;
}) {
  // A fresh `key` is passed on each open, so this component mounts clean —
  // `initialView` as the initial state is all the reset that's needed.
  const [view, setView] = useState<View>(initialView);
  const [selectedTs, setSelectedTs] = useState<number | null>(null);
  const [backupNote, setBackupNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const selected = history.find((h) => h.ts === selectedTs) ?? null;

  const remove = (ts: number) => {
    const next = history.filter((h) => h.ts !== ts);
    saveHistory(slug, next);
    onHistoryChange(next);
    setView("list");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writing-history-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupNote(`Downloaded ${history.length} record${history.length === 1 ? "" : "s"}.`);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const uploaded = JSON.parse(String(evt.target?.result));
        if (!Array.isArray(uploaded)) throw new Error("not an array");
        const existing = new Set(history.map((h) => h.ts));
        const fresh = (uploaded as WritingAttempt[]).filter(
          (h) => h && typeof h.ts === "number" && !existing.has(h.ts),
        );
        const merged = history.concat(fresh).sort((a, b) => a.ts - b.ts);
        saveHistory(slug, merged);
        onHistoryChange(merged);
        setBackupNote(
          `Added ${fresh.length} new record${fresh.length === 1 ? "" : "s"} (skipped duplicates).`,
        );
      } catch {
        setBackupNote("Couldn't read that file — use a backup downloaded from this app.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {view === "cheat"
              ? "Quick reference"
              : view === "reminders"
                ? "Quick reminders"
                : view === "detail"
                  ? "Attempt review"
                  : "Progress history"}
          </h2>
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-md border border-border px-3 py-1 text-sm hover:bg-surface"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>

        {view === "list" && (
          <ListView
            history={history}
            onOpen={(ts) => {
              setSelectedTs(ts);
              setView("detail");
            }}
            onDelete={remove}
            onExport={exportJson}
            onImportClick={() => fileInputRef.current?.click()}
            onCheat={() => setView("cheat")}
            onReminders={() => setView("reminders")}
            backupNote={backupNote}
          />
        )}

        {view === "detail" && selected && (
          <DetailView
            record={selected}
            onDelete={() => remove(selected.ts)}
            onRetest={() => {
              onRetest({
                taskType: selected.taskType,
                taskTitle: selected.taskTitle,
                taskBody:
                  selected.taskBody && selected.taskBody.length
                    ? selected.taskBody
                    : ["Write your response to this task."],
              });
              onClose();
            }}
          />
        )}

        {view === "cheat" && <CheatSheet history={history} genre={activeGenre} />}
        {view === "reminders" && <QuickReminders />}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ListView({
  history,
  onOpen,
  onDelete,
  onExport,
  onImportClick,
  onCheat,
  onReminders,
  backupNote,
}: {
  history: WritingAttempt[];
  onOpen: (ts: number) => void;
  onDelete: (ts: number) => void;
  onExport: () => void;
  onImportClick: () => void;
  onCheat: () => void;
  onReminders: () => void;
  backupNote: string;
}) {
  const btn =
    "rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-surface transition-colors";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button type="button" className={btn} onClick={onExport}>
          Download backup (.json)
        </button>
        <button type="button" className={btn} onClick={onImportClick}>
          Upload backup (.json)
        </button>
        <button type="button" className={btn} onClick={onCheat}>
          Quick reference
        </button>
        <button type="button" className={btn} onClick={onReminders}>
          Quick reminders
        </button>
        {backupNote && (
          <span className="text-[11px] text-correct">{backupNote}</span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No attempts saved yet — submit a practice response, or upload a backup, to see
          progress here.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted">
                  {["Date", "Type", "@35:00", "Final", "WPM", "Struct", "Style", "Tense", "Cohes", "Syntax", "Total", ""].map(
                    (th) => (
                      <th key={th} className="border-b border-border px-2 py-1.5">
                        {th}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <tr
                      key={h.ts}
                      className="cursor-pointer hover:bg-surface"
                      onClick={() => onOpen(h.ts)}
                    >
                      <td className="border-b border-border px-2 py-1.5">{h.dateLabel}</td>
                      <td className="border-b border-border px-2 py-1.5 capitalize">
                        {h.taskType}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        {h.wordsAt35 ?? "–"}
                      </td>
                      <td className="border-b border-border px-2 py-1.5">{h.finalWords}</td>
                      <td className="border-b border-border px-2 py-1.5">{h.wpm}</td>
                      {SCORE_KEYS.map((k) => (
                        <td key={k} className="border-b border-border px-2 py-1.5">
                          {h.scores[k] ?? 0}/5
                        </td>
                      ))}
                      <td className="border-b border-border px-2 py-1.5 font-bold">
                        {h.total}/25
                      </td>
                      <td className="border-b border-border px-2 py-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Delete this attempt from history? This can't be undone.",
                              )
                            ) {
                              onDelete(h.ts);
                            }
                          }}
                          className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted hover:border-incorrect hover:text-incorrect"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">Click any row to reopen its full review.</p>
          <ScoreTrendChart history={history} />
        </>
      )}
    </div>
  );
}

function AttemptFacts({ record }: { record: WritingAttempt }) {
  const rows: [string, string | number][] = [
    ["Words at 35:00", record.wordsAt35 ?? "–"],
    ["Final words", record.finalWords],
    ["Time used", record.timeUsed],
    ["Pace", `${record.wpm} words/min`],
  ];
  return (
    <div className="max-w-sm">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex justify-between border-b border-dashed border-border py-1 font-mono text-sm last:border-none"
        >
          <span className="text-muted">{k}</span>
          <span className="font-bold">{v}</span>
        </div>
      ))}
    </div>
  );
}

function DetailView({
  record,
  onDelete,
  onRetest,
}: {
  record: WritingAttempt;
  onDelete: () => void;
  onRetest: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted">
          {record.dateLabel} · <span className="capitalize">{record.taskType}</span> —{" "}
          {record.taskTitle}
        </p>
        <span className="font-mono text-sm font-bold">Overall: {record.total} / 25</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetest}
          className="rounded-full border border-border px-3.5 py-1.5 font-medium hover:bg-surface"
        >
          Retest same task
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this attempt from history? This can't be undone.")) {
              onDelete();
            }
          }}
          className="rounded-full border border-border px-3.5 py-1.5 font-medium text-muted hover:border-incorrect hover:text-incorrect"
        >
          Delete attempt
        </button>
      </div>

      {record.taskBody.length > 0 && (
        <div className="rounded-lg border border-border border-l-2 border-l-accent bg-surface/40 p-3 font-serif text-[15px] leading-relaxed">
          {record.taskBody.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
          ))}
        </div>
      )}

      {record.detailedReport && record.responseText ? (
        <DetailedReportView
          report={record.detailedReport}
          responseText={record.responseText}
        />
      ) : record.responseText ? (
        <>
          <SectionTitle>Response</SectionTitle>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface/40 p-4 font-serif text-[15px] leading-loose">
            {record.responseText}
          </div>
          <p className="text-xs text-muted">
            The Logs report wasn&apos;t opened for this attempt, so only the summary score
            was saved.
          </p>
        </>
      ) : null}

      <SectionTitle>Attempt details</SectionTitle>
      <AttemptFacts record={record} />

      <div className="mt-3">
        <ScoreGrid scores={record.scores} />
      </div>

      {record.strengths.length > 0 && (
        <>
          <SectionTitle>What was working well</SectionTitle>
          <Bullets items={record.strengths} />
        </>
      )}
      {record.tips.length > 0 && (
        <>
          <SectionTitle>Tips given</SectionTitle>
          <Bullets items={record.tips} />
        </>
      )}
    </div>
  );
}

function CheatSheet({
  history,
  genre,
}: {
  history: WritingAttempt[];
  genre: WritingGenre;
}) {
  const focus = computePersonalFocus(history);
  const paras = formula(genre);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {focus.reportsCounted > 0 &&
        (focus.mistakeFocus.length > 0 || focus.rareTechniques.length > 0) && (
          <div className="rounded-lg border border-correct/40 bg-correct/10 p-3">
            <SectionTitle>
              Personal focus areas (from {focus.reportsCounted} past detailed report
              {focus.reportsCounted === 1 ? "" : "s"})
            </SectionTitle>
            {focus.mistakeFocus.length > 0 && (
              <p>
                Most common mistake types:{" "}
                <strong>
                  {focus.mistakeFocus.map((k) => MISTAKE_LABELS[k] ?? k).join(", ")}
                </strong>
                .
              </p>
            )}
            {focus.rareTechniques.length > 0 && (
              <p>
                Techniques rarely used yet: <strong>{focus.rareTechniques.join(", ")}</strong>{" "}
                — try one of these next time.
              </p>
            )}
          </div>
        )}

      <SectionTitle>
        {genre === "narrative" ? "Narrative" : "Persuasive"} — paragraph-by-paragraph formula
      </SectionTitle>
      <div className="flex flex-col gap-2">
        {paras.map((p) => (
          <div
            key={p.title}
            className={`rounded-lg border border-border bg-surface/40 p-3 border-l-2 ${
              genre === "narrative" ? "border-l-emerald-500" : "border-l-amber-500"
            }`}
          >
            <p
              className={`text-[13px] font-bold ${
                genre === "narrative"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {p.title}
            </p>
            <p className="mb-1.5 text-[13px]">
              <em>Goal:</em> {p.goal}
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              {p.lines.map((l) => (
                <li key={l.label}>
                  <strong>{l.label}:</strong> {l.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Showing the {genre} formula since that&apos;s the current task type. The genre
        alternates each visit.
      </p>
    </div>
  );
}

function QuickReminders() {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted">
        Glance at this while writing — not a checklist to fill in, just quick nudges.
      </p>
      {QUICK_REMINDERS.map((section) => (
        <div key={section.group}>
          <SectionTitle>{section.group}</SectionTitle>
          <ul className="space-y-1">
            {section.items.map((it) => (
              <li key={it} className="flex gap-2">
                <span className="font-bold text-correct">✓</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Re-export so the page can label rows consistently if needed.
export { SCORE_LABELS };
