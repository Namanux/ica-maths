"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * A Beehave focus/session timer that survives navigating away from the
 * Beehave page (and logging out) instead of dying with the component that
 * started it.
 *
 * It lives in root layout (mounted once, for the whole app) so it is never
 * unmounted by client-side navigation, and is mirrored to localStorage so it
 * also survives a full page reload. Like KidDashboard's original timer, it's
 * anchored to a wall-clock epoch rather than a naive +1 counter, so it
 * self-corrects after the tab is backgrounded.
 *
 * A session is only ever "active" (non-null) while it is actually ticking —
 * there is no separate paused-but-visible state. Calling `stopAndRecord`
 * both ends the running segment (writing it to Supabase `session_runs`, the
 * same table/shape KidDashboard already wrote to directly) and clears the
 * session, i.e. "discontinues" it.
 */

export type ActiveSession = {
  kidSlug: string;
  kidId: string;
  kidName: string;
  taskId: string;
  taskName: string;
  taskIcon?: string;
  scheduledDate: string; // yyyy-mm-dd, for the session_runs row
  durationSecs: number; // 0 = no fixed target
  totalElapsed: number; // seconds banked before the segment running now
  anchorEpoch: number; // ms — when the current running segment began
  startedAt: string; // ISO version of anchorEpoch, for the DB row
  runId: string; // stable id for this segment's session_runs row
};

type StartOptions = Omit<
  ActiveSession,
  "anchorEpoch" | "startedAt" | "runId"
>;

function newRunId(): string {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(
      16,
      20,
    )}-${h.slice(20)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

type ActiveSessionContextValue = {
  session: ActiveSession | null;
  elapsed: number;
  remaining: number | null;
  startSession: (opts: StartOptions) => void;
  /** Ends the running segment, records it, and clears the session. Returns the final total elapsed seconds (0 if nothing was active). */
  stopAndRecord: () => Promise<number>;
};

const STORAGE_KEY = "honeycomb-active-session";
const ActiveSessionContext = createContext<ActiveSessionContextValue | undefined>(
  undefined
);

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const [, forceTick] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Hydrate from localStorage once, client-side only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    hydrated.current = true;
  }, []);

  // Mirror every change (skip the pre-hydration render so we don't clobber a
  // stored session with the initial null).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (session) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage unavailable */
    }
  }, [session]);

  // Re-render every second while a session is running so elapsed/remaining
  // (computed fresh from Date.now() below) stay live for every consumer.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  // iOS suspends timers (and often the whole tab) while the iPad is asleep or
  // Safari is backgrounded. The moment we're visible again, recompute from the
  // wall clock so the timer snaps to the right value instead of sitting frozen
  // until the next interval fires.
  useEffect(() => {
    if (!session) return;
    const wake = () => forceTick((t) => t + 1);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, [session]);

  // Heartbeat: while a session runs, keep an open row in `session_runs`
  // (ended_at null) up to date every 15s and once immediately. If the tab is
  // killed and localStorage is later wiped, the run is still on the server and
  // KidDashboard's orphan-recovery folds it back in. `stopAndRecord` closes
  // this same row.
  useEffect(() => {
    if (!session) return;
    const s = session;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    const beat = async () => {
      const liveSecs = Math.max(
        0,
        Math.round((Date.now() - s.anchorEpoch) / 1000),
      );
      try {
        await supabase.from("session_runs").upsert(
          {
            id: s.runId,
            task_id: s.taskId,
            kid_id: s.kidId,
            scheduled_date: s.scheduledDate,
            started_at: s.startedAt,
            ended_at: null,
            duration_secs: liveSecs,
          },
          { onConflict: "id" },
        );
      } catch {
        /* best-effort */
      }
    };
    void beat();
    const id = setInterval(() => {
      if (!cancelled) void beat();
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session]);

  const startSession = useCallback((opts: StartOptions) => {
    const now = Date.now();
    setSession({
      ...opts,
      anchorEpoch: now,
      startedAt: new Date(now).toISOString(),
      runId: newRunId(),
    });
  }, []);

  const stopAndRecord = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return 0;
    const endedAt = new Date();
    const liveSecs = Math.max(
      0,
      Math.round((endedAt.getTime() - s.anchorEpoch) / 1000)
    );
    const finalElapsed = s.totalElapsed + liveSecs;
    setSession(null);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Close the heartbeat row for this segment (upsert so it works whether
        // or not a heartbeat already created it).
        await supabase.from("session_runs").upsert(
          {
            id: s.runId,
            task_id: s.taskId,
            kid_id: s.kidId,
            scheduled_date: s.scheduledDate,
            started_at: s.startedAt,
            ended_at: endedAt.toISOString(),
            duration_secs: liveSecs,
          },
          { onConflict: "id" },
        );
      } catch {
        // Best-effort — don't block on a network/DB error.
      }
    }
    return finalElapsed;
  }, []);

  const live = session
    ? Math.max(0, Math.round((Date.now() - session.anchorEpoch) / 1000))
    : 0;
  const elapsed = (session?.totalElapsed ?? 0) + live;
  const remaining =
    session && session.durationSecs > 0
      ? Math.max(0, session.durationSecs - elapsed)
      : null;

  return (
    <ActiveSessionContext.Provider
      value={{ session, elapsed, remaining, startSession, stopAndRecord }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) {
    throw new Error("useActiveSession must be used within ActiveSessionProvider");
  }
  return ctx;
}
