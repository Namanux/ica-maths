"use client";

import {
  useState,
  useEffect,
  useRef,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBeehaveAuth, type BeehaveProfile } from "@/lib/beehaveAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { beehave } from "@/lib/beehave";
import {
  buildPassbook,
  PassbookRow,
  PolicingTab,
  undoPassbookEntry,
  localDateStr,
  localStartOfDayISO,
  REWARD_CATEGORIES,
  rewardCategory,
  sortRewards,
  RewardSortSelect,
  type PbEntry,
  type CoinTxn,
  type RedemptionRowLite,
  type RewardSort,
  type PolicingTaskRow,
} from "./KidDashboard";
import * as XLSX from "xlsx";

const supabase = getSupabaseClient();

// ─── Types ───────────────────────────────────────────────────────────────────
export type KidRow = BeehaveProfile & {
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  coin_balance: number;
};

type TaskRow = {
  id: string;
  name: string;
  icon: string;
  start_time: string;
  expiry_time?: string | null;
  deadline_time?: string | null;
  end_time?: string | null;
  target_duration?: number | null;
  task_type?: string | null;
  full_coins: number;
  min_coins?: number | null;
  penalty_coins: number;
  days_of_week?: number[] | null;
  assigned_to?: string;
  requires_approval?: boolean | null;
  requires_photo?: boolean | null;
  approval?: string | null;
  note?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  repeat_freq?: string | null; // null|'none'|'day'|'week'|'month'|'year'
  repeat_interval?: number | null;
  repeat_count?: number | null;
  is_active?: boolean;
  pending_parent_review?: boolean;
  kid?: { name?: string; avatar_emoji?: string } | null;
  [k: string]: unknown;
};

type CompletionRow = {
  id: string;
  task_id: string;
  kid_id: string;
  coins_earned: number;
  status: string;
  scheduled_date?: string;
  completed_at?: string | null;
  completion_count?: number | null;
  photo_path?: string | null;
  time_spent_secs?: number | null;
  task?: TaskRow | null;
  kid?: KidRow | null;
};

type InitiativeRow = {
  id: string;
  kid_id: string;
  note?: string | null;
  before_photo_path?: string | null;
  after_photo_path?: string | null;
  status: string;
  created_at?: string;
  kid?: KidRow | null;
};

type RewardRow = {
  id: string;
  name: string;
  icon: string;
  coin_cost: number;
  description?: string | null;
  is_active?: boolean;
};

type RedemptionRow = {
  id: string;
  kid_id: string;
  coins_spent: number;
  status: string;
  kid?: { name?: string; avatar_emoji?: string } | null;
  reward?: { name?: string; icon?: string } | null;
};

/* Emoji font stack — ensures emoji render as color glyphs, not CJK fallbacks */
const EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

/* ─── Emoji Picker ─── */
const TASK_EMOJIS = [
  "✏️", "✒️", "✂️", "☑️", "❓", "❗", "➕", "➗", "⌚",
  "☀️", "⭐", "☁️", "⛅", "☔", "❄️", "⚡", "☄️", "⛄",
  "☯️", "☸️", "✝️", "☪️", "✡️", "⛩️", "☺️", "☹️", "❤️",
  "⚽", "⚾", "⛳", "⛵", "⛷️", "⛸️", "⛹️", "⚔️",
  "☕", "⛽", "⚗️",
  "⚙️", "⚓", "⚖️", "⚛️", "✈️", "⛺", "⛲", "⛰️",
  "✨", "♻️", "♿", "⚠️", "⛔", "✅", "❌",
  "⬆️", "⬇️", "➡️", "↩️", "♾️",
];

// Kid- / money- / reward-focused set for the Rewards form.
const REWARD_EMOJIS = [
  "🎁", "🎀", "🏆", "🥇", "🎖️", "⭐", "🌟", "✨",
  "🎉", "🎊", "🎈", "💯", "💎", "💰", "💵", "🪙",
  "🛍️", "🛒", "🎮", "🕹️", "📱", "💻", "📺", "🎧",
  "🎬", "🍿", "🎟️", "🎡", "🎢", "🎠", "🏰", "🧸",
  "🚲", "🛴", "🛹", "⚽", "🏀", "🎾", "🏓", "🎯",
  "🎨", "🖍️", "🎤", "🎸", "🥁", "🎲", "🧩", "📚",
  "🍦", "🍩", "🍪", "🎂", "🧁", "🍫", "🍭", "🍕",
  "🍔", "🍟", "🥤", "🧃", "🍉", "🍓", "🐶", "🐱",
  "🐰", "🦄", "🐢", "🌈", "🔥", "🏖️", "⛺", "🎣",
  "🚗", "✈️", "🎓", "🛌", "⏰", "🕐", "😴", "🎵",
];

function EmojiPicker({
  value,
  onChange,
  emojis = TASK_EMOJIS,
}: {
  value: string;
  onChange: (v: string) => void;
  emojis?: string[];
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    // Capture phase so this runs before a parent form's Esc handler.
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [open]);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Pick emoji"
        className="flex h-[52px] w-16 items-center justify-center rounded-[10px] border bg-surface text-[24px] transition-colors"
        style={{
          borderColor: open ? "#f5c518" : "var(--border)",
          fontFamily: EMOJI_FONT,
        }}
      >
        {value || "⭐"}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90]"
          />
          <div
            className="absolute left-0 top-full z-[100] mt-1 grid max-h-[220px] w-[296px] grid-cols-8 gap-0.5 overflow-y-auto rounded-xl border border-border bg-surface p-2.5 shadow-2xl"
          >
            {emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className="rounded-md px-0.5 py-[5px] text-[22px] leading-[1.2]"
                style={{
                  fontFamily: EMOJI_FONT,
                  background:
                    value === e ? "rgba(245,197,24,0.2)" : "transparent",
                  border:
                    value === e
                      ? "1px solid rgba(245,197,24,0.4)"
                      : "1px solid transparent",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TABS = [
  "Overview",
  "Task",
  "Reward",
  "Policing",
  "Message",
  "Passbook",
] as const;
type TabName = (typeof TABS)[number];

// ─── Main ParentDashboard ────────────────────────────────────────────────────
export function ParentDashboard(_props: { profileSlug: string }) {
  const { profile, profiles, loading, error } = useBeehaveAuth();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "";
  const tab: TabName = (TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabName)
    : "Overview";

  const kids = profiles.filter((p) => p.role === "kid") as KidRow[];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted">
        <div className="text-5xl">🐝</div>
        <p className="text-sm">Loading Beehave…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted">
        <div className="text-5xl">🐝</div>
        <p className="text-sm font-medium text-foreground">
          Beehave isn&apos;t set up yet
        </p>
        <p className="max-w-sm text-sm">
          {error ?? "No Beehave profile is linked to this account."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      {/* Tabs live in the app header (SiteHeader); this view is just content. */}
      {tab === "Overview" ? (
        <div className="flex min-h-0 flex-1 flex-col px-3.5 pt-3.5">
          <OverviewTab kids={kids} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3.5 pt-3.5">
          {tab === "Task" && <TasksTab kids={kids} />}
          {tab === "Reward" && <RewardsTab kids={kids} />}
          {tab === "Policing" && <PolicingTab />}
          {tab === "Message" && <MessageTab kids={kids} profile={profile} />}
          {tab === "Passbook" && (
            <>
              <ApproveTab onApprove={() => {}} profile={profile} kids={kids} />
              <ParentPassbooks kids={kids} profile={profile} />
            </>
          )}
          <div className="h-[60px]" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ OVERVIEW TAB ═══════════════════ */
type ChartGroup = {
  label: string;
  date?: string;
  kids: { name: string; color: string; done: number }[];
};

/* Collapsible strip at the top of the Overview list: the kids' task
   completions waiting for a parent's approval. Photo-evidence rows link out
   to the full Passbook review flow; the rest can be approved/rejected inline. */
function ApprovalsBanner({ onChange }: { onChange?: () => void }) {
  const router = useRouter();
  const [queue, setQueue] = useState<CompletionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void load();
    if (!supabase) return;
    const ch = supabase
      .channel("beehave-overview-approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, []);

  async function load() {
    if (!supabase) return;
    const { data } = await supabase
      .from("task_completions")
      .select("*, task:task_id(*), kid:kid_id(*)")
      .eq("status", "pending_approval")
      .order("created_at");
    setQueue((data as CompletionRow[]) || []);
  }

  async function quickApprove(comp: CompletionRow) {
    if (!supabase || busyId) return;
    setBusyId(comp.id);
    try {
      const coins = comp.coins_earned;
      await supabase
        .from("task_completions")
        .update({ status: "approved", coins_earned: coins, photo_path: null })
        .eq("id", comp.id);
      await supabase.from("coin_transactions").insert({
        kid_id: comp.kid_id,
        amount: coins,
        reason: `Approved: ${comp.task?.name ?? "task"}`,
        transaction_type: "task_reward",
        reference_id: comp.id,
      });
      const { data: kid } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", comp.kid_id)
        .single();
      await supabase
        .from("profiles")
        .update({
          coin_balance: Math.max(
            0,
            ((kid as { coin_balance?: number } | null)?.coin_balance || 0) +
              coins,
          ),
        })
        .eq("id", comp.kid_id);
      await load();
      onChange?.();
    } finally {
      setBusyId(null);
    }
  }

  async function quickReject(comp: CompletionRow) {
    if (!supabase || busyId) return;
    if (!confirm(`Reject "${comp.task?.name ?? "this task"}"?`)) return;
    setBusyId(comp.id);
    try {
      await supabase
        .from("task_completions")
        .update({ status: "rejected", photo_path: null })
        .eq("id", comp.id);
      await load();
      onChange?.();
    } finally {
      setBusyId(null);
    }
  }

  if (queue.length === 0) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[#f5c518]/35 bg-[#f5c518]/[0.07]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-[14px]">🔔</span>
        <span className="flex-1 text-[13px] font-bold text-[#f5c518]">
          {queue.length} task{queue.length !== 1 ? "s" : ""} waiting for approval
        </span>
        <span className="text-[11px] text-muted">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {open && (
        <div className="border-t border-[#f5c518]/20 px-3 pb-2 pt-1">
          {queue.map((comp) => {
            const hasPhoto = !!comp.photo_path;
            const busy = busyId === comp.id;
            return (
              <div
                key={comp.id}
                className="flex items-center gap-2 border-b border-border/50 py-2 last:border-0"
              >
                <span
                  className="shrink-0 text-[18px]"
                  style={{ fontFamily: EMOJI_FONT }}
                >
                  {comp.task?.icon ?? "✅"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {comp.task?.name ?? "Task"}
                  </div>
                  <div className="text-[11px] text-muted">
                    {comp.kid?.avatar_emoji} {comp.kid?.name} · 🪙{" "}
                    {comp.coins_earned}
                    {hasPhoto ? " · 📷 photo" : ""}
                  </div>
                </div>
                {hasPhoto ? (
                  <button
                    onClick={() => router.push("?tab=Passbook")}
                    className="shrink-0 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/12 px-2.5 py-1 text-[12px] font-semibold text-[#4f8ef7]"
                  >
                    Review →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => quickReject(comp)}
                      disabled={busy}
                      className="shrink-0 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/12 px-2 py-1 text-[12px] font-semibold text-[#ef4444] disabled:opacity-40"
                    >
                      ✗
                    </button>
                    <button
                      onClick={() => quickApprove(comp)}
                      disabled={busy}
                      className="shrink-0 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/12 px-2.5 py-1 text-[12px] font-semibold text-[#22c55e] disabled:opacity-40"
                    >
                      {busy ? "…" : "✓ Approve"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
          <button
            onClick={() => router.push("?tab=Passbook")}
            className="mt-2 w-full rounded-lg py-1.5 text-[12px] font-semibold text-[#4f8ef7] hover:underline"
          >
            Review all in Passbook (photos · coin tweaks · notes) →
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ kids }: { kids: KidRow[] }) {
  const { refreshCurrentProfile } = useBeehaveAuth();
  const [showAddCal, setShowAddCal] = useState(false);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [kidData, setKidData] = useState<
    (KidRow & {
      tasks: TaskRow[];
      completions: CompletionRow[];
      earnedToday: number;
    })[]
  >([]);
  const [chartData, setChartData] = useState<ChartGroup[]>([]);

  const today = localDateStr(new Date());
  const kidColors = ["#ec4899", "#4f8ef7", "#a855f7", "#22c55e"];

  // List / calendar / split view (remembered per device).
  const [view, setView] = useState<"list" | "calendar" | "split">("split");
  // Which kids' columns to show (empty = all).
  const [shown, setShown] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const v = localStorage.getItem("beehave-admin-view");
      if (v === "list" || v === "calendar" || v === "split") setView(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function pickView(v: "list" | "calendar" | "split") {
    setView(v);
    try {
      localStorage.setItem("beehave-admin-view", v);
    } catch {
      /* storage unavailable */
    }
  }
  // The list pane shows either the per-kid summary cards or the full task
  // manager (create / edit / Excel / clear-all — every kid, ignores the
  // chip + period filters).
  const [listMode, setListMode] = useState<"summary" | "tasks">("summary");
  useEffect(() => {
    try {
      const m = localStorage.getItem("beehave-admin-listmode");
      if (m === "summary" || m === "tasks") setListMode(m);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function pickListMode(m: "summary" | "tasks") {
    setListMode(m);
    try {
      localStorage.setItem("beehave-admin-listmode", m);
    } catch {
      /* storage unavailable */
    }
  }
  function toggleKid(id: string) {
    setShown((prev) => {
      const next = new Set(prev.size ? prev : kids.map((k) => k.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Never leave zero selected.
      return next.size ? next : new Set(kids.map((k) => k.id));
    });
  }
  const isShown = (id: string) => shown.size === 0 || shown.has(id);
  const shownKids = kids.filter((k) => isShown(k.id));
  const shownColors = kids
    .map((k, i) => (isShown(k.id) ? kidColors[i % kidColors.length] : null))
    .filter((c): c is string => c !== null);

  // Day shown in the calendar (also drives the "today" summary query).
  const [calDate, setCalDate] = useState(new Date());
  const calIsToday = localDateStr(calDate) === localDateStr(new Date());
  function shiftCalDate(delta: number) {
    const d = new Date(calDate);
    d.setDate(d.getDate() + delta);
    setCalDate(d);
  }
  const calLabel = calIsToday
    ? "Today"
    : calDate.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
  const [newTaskSig, setNewTaskSig] = useState(0);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kids.length, period]);

  async function loadData() {
    if (!supabase) return;
    const dayOfWeek = new Date().getDay();

    const data = await Promise.all(
      kids.map(async (kid) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("assigned_to", kid.id)
          .eq("is_active", true)
          .contains("days_of_week", [dayOfWeek]);
        const { data: comps } = await supabase
          .from("task_completions")
          .select("*")
          .eq("kid_id", kid.id)
          .eq("scheduled_date", today);
        const { data: txns } = await supabase
          .from("coin_transactions")
          .select("amount")
          .eq("kid_id", kid.id)
          .gte("created_at", localStartOfDayISO())
          .gt("amount", 0);
        const earnedToday = ((txns as { amount: number }[]) || []).reduce(
          (sum, t) => sum + t.amount,
          0,
        );
        return {
          ...kid,
          tasks: ((tasks as TaskRow[]) || []).filter((t) =>
            taskOccursOn(t, new Date()),
          ),
          completions: (comps as CompletionRow[]) || [],
          earnedToday,
        };
      }),
    );
    setKidData(data);

    if (period !== "today") {
      const days = period === "week" ? 7 : 30;
      const dates = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return localDateStr(d);
      });
      const startDate = dates[0];
      const { data: allComps } = await supabase
        .from("task_completions")
        .select("kid_id, scheduled_date, status")
        .in(
          "kid_id",
          kids.map((k) => k.id),
        )
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", today);

      const grouped: ChartGroup[] = dates.map((date) => {
        const d = new Date(date + "T12:00:00");
        const label =
          period === "week"
            ? d.toLocaleDateString("en-AU", { weekday: "short" })
            : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
        return {
          label,
          date,
          kids: kids.map((kid, idx) => ({
            name: kid.name,
            color: kidColors[idx % kidColors.length],
            done: (
              (allComps as {
                scheduled_date: string;
                kid_id: string;
                status: string;
              }[]) || []
            ).filter(
              (c) =>
                c.scheduled_date === date &&
                c.kid_id === kid.id &&
                c.status !== "rejected",
            ).length,
          })),
        };
      });
      setChartData(grouped);
    }
  }

  const cards = (
    <div
      className="mb-3.5 grid gap-2.5"
      style={{
        gridTemplateColumns:
          view === "split"
            ? "1fr"
            : `repeat(${shownKids.length || 1}, 1fr)`,
      }}
    >
      {kidData
        .filter((k) => isShown(k.id))
        .map((kid) => {
          const idx = kids.findIndex((k) => k.id === kid.id);
          const level = beehave.coinsToLevel(kid.coin_balance || 0);
          const done = kid.completions.filter(
            (c) => c.status !== "rejected",
          ).length;
          const total = kid.tasks.length;
          return (
            <div
              key={kid.id}
              className="rounded-2xl border bg-surface px-3.5 pb-3 pt-3.5"
              style={{ borderColor: `${kidColors[idx % kidColors.length]}33` }}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
                  style={{
                    background:
                      kid.avatar_color || kidColors[idx % kidColors.length],
                    border: `2px solid ${kidColors[idx % kidColors.length]}66`,
                  }}
                >
                  {kid.avatar_emoji || "😊"}
                </div>
                <div>
                  <div className="text-[14px] font-bold">{kid.name}</div>
                  <div className="text-[11px] text-[#f5c518]">
                    {level.emoji} {level.label}
                  </div>
                </div>
              </div>

              <div className="mb-2.5 h-[5px] overflow-hidden rounded-[3px] bg-border">
                <div
                  className="h-full rounded-[3px] transition-[width] duration-500"
                  style={{
                    width: total > 0 ? `${(done / total) * 100}%` : "0%",
                    background:
                      done === total && total > 0
                        ? "#22c55e"
                        : kidColors[idx % kidColors.length],
                  }}
                />
              </div>

              <div className="flex gap-1.5">
                <StatChip
                  label="Balance"
                  value={`🪙 ${beehave.formatCoins(kid.coin_balance || 0)}`}
                  color={kidColors[idx % kidColors.length]}
                />
                <StatChip
                  label="Earned today"
                  value={`+${kid.earnedToday}`}
                  color="#f5c518"
                />
                <StatChip
                  label="Done"
                  value={`${done}/${total}`}
                  color="#22c55e"
                />
              </div>
            </div>
          );
        })}
    </div>
  );

  const chart = period !== "today" && chartData.length > 0 && (
    <CompletionChart
      data={chartData}
      period={period}
      kids={shownKids}
      kidColors={shownColors}
    />
  );

  const calendar = (
    <CalendarGrid
      kids={shownKids}
      kidColors={shownColors}
      onApprovalComplete={loadData}
      fill
      hideToolbar
      externalDate={calDate}
      onExternalDateChange={setCalDate}
      newTaskSignal={newTaskSig}
    />
  );

  const listModeToggle = (
    <div className="mb-2.5 flex items-center gap-1">
      {(["summary", "tasks"] as const).map((m) => (
        <button
          key={m}
          onClick={() => pickListMode(m)}
          className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
            listMode === m
              ? "bg-[#f5c518] text-[#0f0f1a]"
              : "border border-border text-muted"
          }`}
        >
          {m === "summary" ? "📊 Summary" : "📋 All tasks"}
        </button>
      ))}
    </div>
  );

  const listBody =
    listMode === "tasks" ? (
      <TaskManagerPanel kids={kids} />
    ) : (
      <>
        {cards}
        {chart}
      </>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Controls — one wrapping row: [kids + period]  ‹ date ›  [+ New Task · view] */}
      <div className="mb-2.5 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 pb-1">
        <div className="flex flex-wrap items-center gap-1">
          {kids.length > 1 &&
            kids.map((k, i) => (
              <button
                key={k.id}
                onClick={() => toggleKid(k.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors ${
                  isShown(k.id)
                    ? "text-[#0f0f1a]"
                    : "border border-border text-muted"
                }`}
                style={
                  isShown(k.id)
                    ? { background: kidColors[i % kidColors.length] }
                    : undefined
                }
              >
                <span>{k.avatar_emoji ?? "🙂"}</span>
                {k.name}
              </button>
            ))}

          <button
            onClick={() => setShowAddCal(true)}
            title="Add a kid or a personal calendar"
            className="rounded-md border border-dashed border-border px-2 py-1 text-[12px] font-semibold text-muted hover:text-foreground"
          >
            + Calendar
          </button>

          {view !== "calendar" &&
            listMode === "summary" &&
            (["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize"
                style={{
                  background: period === p ? "#f5c518" : "var(--border)",
                  color: period === p ? "#0f0f1a" : "var(--muted)",
                  border: period === p ? "none" : "1px solid var(--border)",
                }}
              >
                {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
              </button>
            ))}
        </div>

        {view !== "list" && (
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <button
              onClick={() => shiftCalDate(-1)}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-border bg-surface text-[15px] text-muted"
            >
              ‹
            </button>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">
              {calLabel}
            </span>
            <button
              onClick={() => shiftCalDate(1)}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-border bg-surface text-[15px] text-muted"
            >
              ›
            </button>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {view !== "list" && (
            <button
              onClick={() => setNewTaskSig((n) => n + 1)}
              className="shrink-0 rounded-md bg-[#f5c518] px-2 py-1 text-[12px] font-semibold text-[#0f0f1a]"
            >
              + New Task
            </button>
          )}
          {(["list", "calendar", "split"] as const).map((v) => (
            <button
              key={v}
              onClick={() => pickView(v)}
              title={v}
              className={`shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors ${
                view === v
                  ? "bg-[#f5c518] text-[#0f0f1a]"
                  : "border border-border text-muted"
              }`}
            >
              {v === "list" ? "📋" : v === "calendar" ? "📅" : "⧉"}
              <span className="ml-1">
                {v === "list" ? "List" : v === "calendar" ? "Calendar" : "Split"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {view === "list" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ApprovalsBanner onChange={loadData} />
          {listModeToggle}
          {listBody}
          <div className="h-[60px]" />
        </div>
      )}

      {view === "calendar" && (
        <div className="flex min-h-0 flex-1 flex-col">{calendar}</div>
      )}

      {view === "split" && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-2">
          <div
            className={`min-h-0 flex-1 overflow-y-auto ${
              listMode === "tasks" ? "lg:max-w-[440px]" : "lg:max-w-[340px]"
            }`}
          >
            <ApprovalsBanner onChange={loadData} />
            {listModeToggle}
            {listBody}
            <div className="h-4" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col lg:border-l lg:border-border lg:pl-2">
            {calendar}
          </div>
        </div>
      )}

      {showAddCal && (
        <AddCalendarModal
          onClose={() => setShowAddCal(false)}
          onCreated={() => void refreshCurrentProfile()}
        />
      )}
    </div>
  );
}

function AddCalendarModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧒");
  const [color, setColor] = useState("#4f8ef7");
  const [kind, setKind] = useState<"kid" | "personal">("kid");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const COLORS = [
    "#ec4899",
    "#4f8ef7",
    "#a855f7",
    "#22c55e",
    "#f97316",
    "#f5c518",
    "#ef4444",
  ];

  async function create() {
    if (!supabase || !name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "calendar";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("profiles").insert({
      name: name.trim(),
      role: "kid",
      slug,
      avatar_emoji: emoji || "🧒",
      avatar_color: color,
      coin_balance: 0,
      is_personal: kind === "personal",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[320] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] rounded-2xl border border-border bg-background p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <h3 className="flex-1 text-[16px] font-bold">Add a calendar</h3>
          <button onClick={onClose} className="text-[16px] text-muted">
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          {(["kid", "personal"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="flex-1 rounded-xl border px-2.5 py-2 text-left"
              style={{
                borderColor: kind === k ? "#f5c518" : "var(--border)",
                background:
                  kind === k ? "rgba(245,197,24,0.12)" : "transparent",
              }}
            >
              <div className="text-[12px] font-bold">
                {k === "kid" ? "🧒 Kid" : "🗓️ Personal"}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {k === "kid"
                  ? "Earns & spends coins"
                  : "Just scheduling — yours"}
              </div>
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoFocus
          className="mb-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] text-foreground"
        />

        <div className="mb-3 flex items-center gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            maxLength={2}
            className="w-14 rounded-[10px] border border-border bg-surface px-2 py-2 text-center text-[18px]"
          />
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full"
                style={{
                  background: c,
                  outline:
                    color === c ? "2px solid var(--foreground)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {err && (
          <div className="mb-2 text-[12px] text-[#ef4444]">{err}</div>
        )}

        <button
          onClick={create}
          disabled={!name.trim() || busy}
          className="w-full rounded-[10px] bg-[#f5c518] px-4 py-2.5 text-[14px] font-semibold text-[#0f0f1a] disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create calendar"}
        </button>
        <p className="mt-2 text-[11px] text-muted">
          Shows as a column straight away. A dedicated login page for a new
          kid still needs adding to the app&apos;s profile list.
        </p>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex-1 rounded-lg px-1 py-1.5 text-center"
      style={{ background: `${color}12`, border: `1px solid ${color}28` }}
    >
      <div className="text-[13px] font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="mt-px text-[10px] text-muted">{label}</div>
    </div>
  );
}

/* ── Calendar constants ── */
const PX_PER_HOUR = 120; // base row height (zoom = 1)
const CAL_ZOOM_MIN = 0.6;
const CAL_ZOOM_MAX = 2.2;
const CAL_START = 5;
const CAL_END = 22;
const CAL_HOURS = Array.from(
  { length: CAL_END - CAL_START },
  (_, i) => i + CAL_START,
);

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function timeToMinutes(t = "00:00"): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeToY(t: string, pxPerHour = PX_PER_HOUR): number {
  return (timeToMinutes(t) - CAL_START * 60) * (pxPerHour / 60);
}

const SNAP_MIN = 5; // drag snaps to 5-minute steps

function minutesToTime(min: number): string {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(
    c % 60,
  ).padStart(2, "0")}`;
}

// How long a block occupies the grid, in minutes.
function taskSpanMinutes(task: TaskRow): number {
  if (
    (task.task_type === "session" || task.task_type === "focus") &&
    task.target_duration
  ) {
    return Math.max(5, Math.round(task.target_duration / 60));
  }
  const s = timeToMinutes(task.start_time);
  const e = timeToMinutes(
    task.expiry_time || task.deadline_time || task.start_time,
  );
  return e > s ? e - s : 30;
}

type LaidOutTask = { task: TaskRow; col: number; totalCols: number };

function layoutTasks(tasks: TaskRow[]): LaidOutTask[] {
  if (!tasks.length) return [];

  function rangeEnd(t: TaskRow): number {
    if (
      (t.task_type === "session" || t.task_type === "focus") &&
      t.target_duration
    ) {
      return (
        timeToMinutes(t.start_time) + Math.round(t.target_duration / 60)
      );
    }
    const e = timeToMinutes(t.expiry_time || t.start_time);
    return e > timeToMinutes(t.start_time)
      ? e
      : timeToMinutes(t.start_time) + 30;
  }

  const assigned = tasks.map((task) => {
    const s = timeToMinutes(task.start_time);
    const e = rangeEnd(task);

    const group = tasks
      .filter((other) => {
        const os = timeToMinutes(other.start_time);
        const oe = rangeEnd(other);
        return os < e && oe > s;
      })
      .sort(
        (a, b) =>
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );

    const cols: number[] = [];
    let myCol = 0;
    for (const t of group) {
      const ts = timeToMinutes(t.start_time);
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c] <= ts) {
          cols[c] = rangeEnd(t);
          if (t.id === task.id) myCol = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        if (t.id === task.id) myCol = cols.length;
        cols.push(rangeEnd(t));
      }
    }

    return { task, col: myCol, totalCols: cols.length };
  });

  return assigned;
}

const QUICK_TASK_H = 22;
const QUICK_TASK_GAP = 2;

function stackQuickTasks(
  tasks: TaskRow[],
  pxPerHour = PX_PER_HOUR,
): { task: TaskRow; y: number }[] {
  if (!tasks.length) return [];
  const sorted = [...tasks].sort(
    (a, b) =>
      timeToMinutes(a.start_time) - timeToMinutes(b.start_time) ||
      (a.id > b.id ? 1 : -1),
  );
  let nextY = -Infinity;
  return sorted.map((task) => {
    const naturalY = timeToY(task.start_time, pxPerHour);
    const y = Math.max(naturalY, nextY);
    nextY = y + QUICK_TASK_H + QUICK_TASK_GAP;
    return { task, y };
  });
}

/* ─── Recurrence ───────────────────────────────────────────────────────────
   A task's schedule is: an anchor (start_date), a frequency, an interval, a
   set of weekdays (weekly only), and an end (a date and/or an occurrence
   count). `repeat_freq` null means the legacy "weekly on days_of_week". */
function ymdToNoon(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}
function daysApart(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

// Rough date of the Nth occurrence (1-indexed) — used only as an "ends after
// N times" cap, so a slightly generous estimate is fine.
function nthOccurrenceDate(
  anchor: Date,
  freq: string,
  interval: number,
  weekdayCount: number,
  n: number,
): Date {
  const d = new Date(anchor);
  const steps = Math.max(0, n - 1);
  if (freq === "day") d.setDate(d.getDate() + steps * interval);
  else if (freq === "month") d.setMonth(d.getMonth() + steps * interval);
  else if (freq === "year") d.setFullYear(d.getFullYear() + steps * interval);
  else if (freq === "none") {
    /* single occurrence — anchor */
  } else {
    // weekly: weekdayCount hits per active week
    const weeks = Math.ceil(n / Math.max(1, weekdayCount)) * interval;
    d.setDate(d.getDate() + weeks * 7);
  }
  return d;
}

// Does this task have an occurrence on `date` (a Date; time part ignored)?
export function taskOccursOn(task: TaskRow, date: Date): boolean {
  const target = new Date(date);
  target.setHours(12, 0, 0, 0);
  const anchor = task.start_date ? ymdToNoon(String(task.start_date)) : null;
  if (anchor && target < anchor) return false;

  const freq = (task.repeat_freq as string | null) || "week";
  const interval = Math.max(1, Number(task.repeat_interval) || 1);
  const days = (task.days_of_week as number[] | null) || [1, 2, 3, 4, 5];

  let end: Date | null = task.end_date ? ymdToNoon(String(task.end_date)) : null;
  const count = task.repeat_count ? Number(task.repeat_count) : null;
  if (count && anchor) {
    const nth = nthOccurrenceDate(anchor, freq, interval, days.length, count);
    if (!end || nth < end) end = nth;
  }
  if (end && target > end) return false;

  switch (freq) {
    case "none":
      return !!anchor && daysApart(target, anchor) === 0;
    case "day":
      return anchor ? daysApart(target, anchor) % interval === 0 : true;
    case "month": {
      if (!anchor) return target.getDate() === 1;
      if (target.getDate() !== anchor.getDate()) return false;
      const months =
        (target.getFullYear() - anchor.getFullYear()) * 12 +
        (target.getMonth() - anchor.getMonth());
      return months >= 0 && months % interval === 0;
    }
    case "year": {
      if (!anchor) return false;
      if (
        target.getMonth() !== anchor.getMonth() ||
        target.getDate() !== anchor.getDate()
      )
        return false;
      const years = target.getFullYear() - anchor.getFullYear();
      return years >= 0 && years % interval === 0;
    }
    default: {
      // weekly
      if (!days.includes(target.getDay())) return false;
      if (!anchor || interval === 1) return true;
      const weeks = Math.round(
        daysApart(weekStart(target), weekStart(anchor)) / 7,
      );
      return weeks >= 0 && weeks % interval === 0;
    }
  }
}

// Short human summary for the collapsed recurrence row.
export function recurrenceSummary(task: {
  repeat_freq?: string | null;
  repeat_interval?: number | null;
  days_of_week?: number[] | null;
  end_date?: string | null;
  repeat_count?: number | null;
}): string {
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const freq = task.repeat_freq || "week";
  const n = Math.max(1, Number(task.repeat_interval) || 1);
  if (freq === "none") return "Does not repeat";
  let base: string;
  if (freq === "day") base = n === 1 ? "Daily" : `Every ${n} days`;
  else if (freq === "month")
    base = n === 1 ? "Monthly" : `Every ${n} months`;
  else if (freq === "year") base = n === 1 ? "Annually" : `Every ${n} years`;
  else {
    const days = (task.days_of_week || []).slice().sort((a, b) => a - b);
    const label =
      days.length === 7
        ? "every day"
        : days.length === 5 && days.every((d) => d >= 1 && d <= 5)
        ? "Mon–Fri"
        : days.map((d) => DOW[d]).join(", ") || "—";
    base = n === 1 ? `Weekly · ${label}` : `Every ${n} weeks · ${label}`;
  }
  if (task.repeat_count) base += ` · ${task.repeat_count}×`;
  else if (task.end_date) base += ` · until ${task.end_date}`;
  return base;
}

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  done: { label: "Done", color: "#22c55e", bg: "rgba(34,197,94,0.18)", icon: "✅" },
  active: { label: "Now", color: "#f5c518", bg: "rgba(245,197,24,0.18)", icon: "⏳" },
  grace: { label: "Late", color: "#f97316", bg: "rgba(249,115,22,0.18)", icon: "⚠️" },
  missed: { label: "Missed", color: "#ef4444", bg: "rgba(239,68,68,0.18)", icon: "❌" },
  upcoming: { label: "Soon", color: "#475569", bg: "rgba(71,85,105,0.14)", icon: "🕐" },
  pending: { label: "Review", color: "#a855f7", bg: "rgba(168,85,247,0.18)", icon: "👀" },
};

type CalendarKidData = KidRow & {
  tasks: TaskRow[];
  sessions: TaskRow[];
  quickTasks: TaskRow[];
  completions: CompletionRow[];
  runsByTask: Record<string, number>;
};

type SheetState = {
  task: TaskRow;
  comp?: CompletionRow;
  kid: CalendarKidData;
};

export function CalendarGrid({
  kids,
  kidColors,
  onApprovalComplete,
  canApprove = true,
  fill = false,
  hideToolbar = false,
  hideColumnHeaders = false,
  externalDate,
  onExternalDateChange,
  newTaskSignal,
}: {
  kids: KidRow[];
  kidColors: string[];
  onApprovalComplete?: () => void;
  canApprove?: boolean;
  fill?: boolean;
  hideToolbar?: boolean; // hide the internal ‹ date › + New Task strip
  hideColumnHeaders?: boolean; // hide the per-kid column name row
  externalDate?: Date; // drive the day from outside
  onExternalDateChange?: (d: Date) => void;
  newTaskSignal?: number; // bump to open a blank task editor
}) {
  const todayStr = () => localDateStr(new Date());

  const [innerDate, setInnerDate] = useState(new Date());
  const selDate = externalDate ?? innerDate;
  const setSelDate = (d: Date) =>
    onExternalDateChange ? onExternalDateChange(d) : setInnerDate(d);
  const [kidData, setKidData] = useState<CalendarKidData[]>([]);
  const [nowY, setNowY] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [editTask, setEditTask] = useState<Partial<TaskRow> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Vertical zoom — how tall an hour is (remembered per device).
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    try {
      const z = parseFloat(localStorage.getItem("beehave-cal-zoom") || "");
      if (z >= CAL_ZOOM_MIN && z <= CAL_ZOOM_MAX) setZoom(z);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function nudgeZoom(delta: number) {
    setZoom((z) => {
      const next = Math.min(
        CAL_ZOOM_MAX,
        Math.max(CAL_ZOOM_MIN, Math.round((z + delta) * 10) / 10),
      );
      try {
        localStorage.setItem("beehave-cal-zoom", String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }
  const pxh = PX_PER_HOUR * zoom; // px per hour
  const pxm = pxh / 60; // px per minute
  const totalH = (CAL_END - CAL_START) * pxh;

  // ── Drag-to-reschedule (long-press then drag up/down) ──
  const [drag, setDrag] = useState<{
    taskId: string;
    deltaPx: number;
    origStartMin: number;
    spanMin: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  function beginPress(task: TaskRow, e: React.PointerEvent) {
    if (e.button && e.button !== 0) return;
    if (!isToday && dateStr < todayStr()) return; // don't reschedule past days
    const startY = e.clientY;
    const isMouse = e.pointerType === "mouse";
    dragMovedRef.current = false;
    // Mouse: drag right away. Touch/pen: hold ~240ms first so a swipe
    // still scrolls the calendar.
    let armed = isMouse;
    const snapshot = {
      taskId: task.id,
      deltaPx: 0,
      origStartMin: timeToMinutes(task.start_time),
      spanMin: taskSpanMinutes(task),
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (timer) clearTimeout(timer);
    };
    const onMove = (ev: PointerEvent) => {
      const raw = ev.clientY - startY;
      if (!armed) {
        if (Math.abs(raw) > 8) cleanup(); // it was a scroll, not a hold
        return;
      }
      if (!dragMovedRef.current && Math.abs(raw) < 3) return; // click jitter
      dragMovedRef.current = true;
      const snapped =
        Math.round(raw / (SNAP_MIN * pxm)) * (SNAP_MIN * pxm);
      setDrag((d) => ({
        ...(d && d.taskId === task.id ? d : snapshot),
        deltaPx: snapped,
      }));
    };
    const onUp = () => {
      cleanup();
      setDrag((d) => {
        if (d && d.taskId === task.id && d.deltaPx !== 0) {
          void commitReschedule(task, d.deltaPx / pxm);
        }
        return null;
      });
    };
    const timer = isMouse ? undefined : setTimeout(() => {
      armed = true;
      setDrag(snapshot);
    }, 240);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const [reschedule, setReschedule] = useState<{
    task: TaskRow;
    newStartMin: number;
    patch: Record<string, string>;
  } | null>(null);

  function commitReschedule(task: TaskRow, deltaMin: number) {
    const span = taskSpanMinutes(task);
    const origStart = timeToMinutes(task.start_time);
    let newStart = Math.round((origStart + deltaMin) / SNAP_MIN) * SNAP_MIN;
    newStart = Math.max(
      CAL_START * 60,
      Math.min(CAL_END * 60 - span, newStart),
    );
    const shift = newStart - origStart;
    if (shift === 0) return;
    const patch: Record<string, string> = {
      start_time: minutesToTime(newStart),
    };
    if (task.expiry_time)
      patch.expiry_time = minutesToTime(
        timeToMinutes(task.expiry_time) + shift,
      );
    if (task.deadline_time)
      patch.deadline_time = minutesToTime(
        timeToMinutes(task.deadline_time) + shift,
      );
    // Keep the block where it was dropped while we ask about scope.
    setKidData((prev) =>
      prev.map((k) => ({
        ...k,
        sessions: k.sessions.map((t) =>
          t.id === task.id ? { ...t, ...patch } : t,
        ),
        quickTasks: k.quickTasks.map((t) =>
          t.id === task.id ? { ...t, ...patch } : t,
        ),
      })),
    );
    setReschedule({ task, newStartMin: newStart, patch });
  }

  async function applyReschedule(scope: "single" | "future") {
    if (!supabase || !reschedule) return;
    const { task, patch } = reschedule;
    let error;
    if (scope === "future") {
      ({ error } = await supabase.from("tasks").update(patch).eq("id", task.id));
    } else {
      ({ error } = await supabase.from("task_overrides").upsert(
        { task_id: task.id, date: dateStr, ...patch },
        { onConflict: "task_id,date" },
      ));
    }
    if (error) alert("Reschedule failed: " + error.message);
    setReschedule(null);
    void loadData();
  }

  async function saveEditedTask(t: Partial<TaskRow>) {
    if (!supabase) return;
    let error;
    if (t.id) {
      ({ error } = await supabase
        .from("tasks")
        .update({ ...t, is_active: true })
        .eq("id", t.id));
    } else {
      ({ error } = await supabase
        .from("tasks")
        .insert({ ...t, is_active: true }));
    }
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    setEditTask(null);
    void loadData();
  }

  async function deleteEditedTask(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").update({ is_active: false }).eq("id", id);
    setEditTask(null);
    void loadData();
  }

  // Undo a completion straight from the calendar block: drop the completion
  // row and reverse whatever coins it earned.
  async function undoCompletion(comp: CompletionRow) {
    if (!supabase) return;
    const { data: txs } = await supabase
      .from("coin_transactions")
      .select("amount")
      .eq("reference_id", comp.id);
    const refunded = ((txs as { amount?: number }[]) || []).reduce(
      (s, x) => s + (x.amount || 0),
      0,
    );
    await supabase
      .from("coin_transactions")
      .delete()
      .eq("reference_id", comp.id);
    if (refunded) {
      const { data: k } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", comp.kid_id)
        .single();
      const bal = (k as { coin_balance?: number } | null)?.coin_balance ?? 0;
      await supabase
        .from("profiles")
        .update({ coin_balance: Math.max(0, bal - refunded) })
        .eq("id", comp.kid_id);
    }
    await supabase.from("task_completions").delete().eq("id", comp.id);
    void loadData();
    onApprovalComplete?.();
  }

  // Mark a task done straight from a kid's calendar (mirrors KidDashboard's
  // completeTask). Photo tasks can't be finished here — open the sheet instead.
  async function completeFromCalendar(task: TaskRow, kid: CalendarKidData) {
    if (!supabase) return;
    // Sessions are timer-scored — a kid can't finish one with a tap; and
    // photo tasks need the capture flow. Both open the detail sheet instead.
    const isSession =
      task.task_type === "session" || task.task_type === "focus";
    if (isSession || task.requires_photo) {
      setSheet({ task, kid });
      return;
    }
    if (kid.completions.find((c) => c.task_id === task.id)) return;
    const coins = beehave.calculateCoins(task as never);
    if (task.requires_approval === true) {
      await supabase.from("task_completions").insert({
        task_id: task.id,
        kid_id: kid.id,
        scheduled_date: dateStr,
        coins_earned: coins,
        status: "pending_approval",
      });
    } else {
      const { data: fresh } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", kid.id)
        .single();
      const bal =
        (fresh as { coin_balance?: number } | null)?.coin_balance || 0;
      const { data: comp, error } = await supabase
        .from("task_completions")
        .insert({
          task_id: task.id,
          kid_id: kid.id,
          scheduled_date: dateStr,
          coins_earned: coins,
          status: "auto_approved",
        })
        .select()
        .single();
      if (error || !comp) {
        void loadData();
        return;
      }
      await supabase.from("coin_transactions").insert({
        kid_id: kid.id,
        amount: coins,
        reason: `Completed: ${task.name}`,
        transaction_type: "task_reward",
        reference_id: (comp as { id?: string }).id,
      });
      await supabase
        .from("profiles")
        .update({ coin_balance: bal + coins })
        .eq("id", kid.id);
    }
    void loadData();
    onApprovalComplete?.();
  }

  // Kid calendar gesture: 1 tap = done, 2 = undo, 3 = edit. Resolved once the
  // click burst settles.
  const kidTapRef = useRef<
    Record<string, { count: number; timer: ReturnType<typeof setTimeout> }>
  >({});
  useEffect(
    () => () => {
      Object.values(kidTapRef.current).forEach((r) => clearTimeout(r.timer));
    },
    [],
  );
  function handleKidTap(
    task: TaskRow,
    kid: CalendarKidData,
    comp?: CompletionRow,
  ) {
    const prev = kidTapRef.current[task.id];
    if (prev) clearTimeout(prev.timer);
    const count = (prev?.count || 0) + 1;
    const isSession =
      task.task_type === "session" || task.task_type === "focus";
    const timer = setTimeout(() => {
      delete kidTapRef.current[task.id];
      if (count >= 3) setEditTask(task);
      else if (count === 2) {
        if (comp) void undoCompletion(comp);
      } else if (isSession) setSheet({ task, comp, kid });
      else if (!comp) void completeFromCalendar(task, kid);
    }, 320);
    kidTapRef.current[task.id] = { count, timer };
  }

  function blankTaskAt(kidId: string, startMin?: number, session = false) {
    return {
      assigned_to: kidId,
      task_type: session ? "session" : "task",
      start_time:
        startMin !== undefined
          ? minutesToTime(Math.round(startMin / SNAP_MIN) * SNAP_MIN)
          : undefined,
    } as Partial<TaskRow>;
  }

  // Right-click / double-click an empty slot → quick "new task/session here".
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    kidId: string;
    startMin: number;
  } | null>(null);

  function openCtxMenu(e: React.MouseEvent, kidId: string) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const yInCol = e.clientY - rect.top;
    const startMin = yInCol / pxm + CAL_START * 60;
    setCtxMenu({ x: e.clientX, y: e.clientY, kidId, startMin });
  }

  // Single click on empty calendar space → open a blank task editor at that
  // time (Google-Calendar style). Task blocks stopPropagation so only genuine
  // empty-space clicks land here.
  function openNewTaskAt(e: React.MouseEvent, kidId: string) {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = (e.clientY - rect.top) / pxm + CAL_START * 60;
    setEditTask(blankTaskAt(kidId, startMin, false));
  }

  const dateStr = localDateStr(selDate);
  const isToday = dateStr === todayStr();

  useEffect(() => {
    function tick() {
      const n = new Date();
      const y = timeToY(
        `${String(n.getHours()).padStart(2, "0")}:${String(
          n.getMinutes(),
        ).padStart(2, "0")}`,
        pxh,
      );
      setNowY(y >= 0 && y <= totalH ? y : null);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pxh, totalH]);

  useEffect(() => {
    if (isToday && scrollRef.current && nowY !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, dateStr]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kids.length, dateStr]);

  async function loadData() {
    if (!supabase) return;
    const dow = selDate.getDay();
    const data = await Promise.all(
      kids.map(async (kid) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("assigned_to", kid.id)
          .eq("is_active", true)
          .contains("days_of_week", [dow]);
        const { data: comps } = await supabase
          .from("task_completions")
          .select("*")
          .eq("kid_id", kid.id)
          .eq("scheduled_date", dateStr);
        const { data: runs } = await supabase
          .from("session_runs")
          .select("task_id, duration_secs")
          .eq("kid_id", kid.id)
          .eq("scheduled_date", dateStr);
        const runsByTask: Record<string, number> = {};
        for (const r of (runs as {
          task_id: string;
          duration_secs?: number;
        }[]) || []) {
          runsByTask[r.task_id] =
            (runsByTask[r.task_id] || 0) + (r.duration_secs || 0);
        }
        const rawTasks = ((tasks as TaskRow[]) || []).filter((t) =>
          taskOccursOn(t, selDate),
        );
        // Per-day time overrides ("just today" drags). Missing table -> ignored.
        const { data: ovs } = await supabase
          .from("task_overrides")
          .select("task_id, start_time, expiry_time, deadline_time")
          .eq("date", dateStr)
          .in(
            "task_id",
            rawTasks.map((t) => t.id),
          );
        const ovMap = new Map(
          ((ovs as Record<string, string | null>[]) || []).map((o) => [
            o.task_id,
            o,
          ]),
        );
        const allTasks = rawTasks.map((t) => {
          const o = ovMap.get(t.id);
          return o
            ? {
                ...t,
                start_time: o.start_time || t.start_time,
                expiry_time: o.expiry_time ?? t.expiry_time,
                deadline_time: o.deadline_time ?? t.deadline_time,
              }
            : t;
        });
        const sessions = allTasks.filter(
          (t) => t.task_type === "session" || t.task_type === "focus",
        );
        const quickTasks = allTasks.filter(
          (t) => t.task_type !== "session" && t.task_type !== "focus",
        );
        return {
          ...kid,
          tasks: allTasks,
          sessions,
          quickTasks,
          completions: (comps as CompletionRow[]) || [],
          runsByTask,
        };
      }),
    );
    setKidData(data);
  }

  function changeDate(delta: number) {
    const d = new Date(selDate);
    d.setDate(d.getDate() + delta);
    setSelDate(d);
  }

  // Parent asks for a new task via the shared header button.
  useEffect(() => {
    if (newTaskSignal) setEditTask(blankTaskAt(kids[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTaskSignal]);

  function taskStatus(task: TaskRow, comp?: CompletionRow): string {
    if (!comp) return beehave.getTaskStatus(task);
    if (comp.status === "rejected") return "missed";
    if (comp.status === "pending_approval") return "pending";
    return "done";
  }

  function blockHeight(task: TaskRow): number {
    const isSession =
      task.task_type === "session" || task.task_type === "focus";
    if (isSession && task.target_duration) {
      const mins = Math.round(task.target_duration / 60);
      return Math.max(24, mins * pxm);
    }
    const start = timeToMinutes(task.start_time || "00:00");
    const end = timeToMinutes(
      task.expiry_time || task.start_time || "00:30",
    );
    const diff = end - start;
    return Math.max(24, diff > 0 ? diff * pxm : 30);
  }

  const dateLabel = isToday
    ? "Today"
    : selDate.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

  async function handleApprove(coins: number) {
    if (!supabase || !sheet) return;
    const { comp, task } = sheet;
    if (!comp) return;
    await supabase
      .from("task_completions")
      .update({ status: "approved", coins_earned: coins })
      .eq("id", comp.id);
    await supabase.from("coin_transactions").insert({
      kid_id: comp.kid_id,
      amount: coins,
      reason: `Approved: ${task.name}`,
      transaction_type: "task_reward",
      reference_id: comp.id,
    });
    const { data: kidRow } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", comp.kid_id)
      .single();
    await supabase
      .from("profiles")
      .update({
        coin_balance: Math.max(
          0,
          ((kidRow as { coin_balance?: number } | null)?.coin_balance || 0) +
            coins,
        ),
      })
      .eq("id", comp.kid_id);
    setSheet(null);
    void loadData();
    onApprovalComplete?.();
  }

  async function handleReject() {
    if (!supabase || !sheet?.comp) return;
    await supabase
      .from("task_completions")
      .update({ status: "rejected" })
      .eq("id", sheet.comp.id);
    setSheet(null);
    void loadData();
    onApprovalComplete?.();
  }

  const colCount = kidData.length;

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col" : ""}>
      {!hideToolbar && (
        <div className="mb-2.5 flex shrink-0 flex-wrap items-center gap-2 px-1">
          <button
            onClick={() => changeDate(-1)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border bg-surface text-[16px] text-foreground"
          >
            ‹
          </button>
          <div className="flex-1 text-center text-[14px] font-bold">
            {dateLabel}
            {!isToday && (
              <span className="ml-1.5 text-[11px] text-muted">
                {selDate.toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border bg-surface text-[16px] text-foreground"
          >
            ›
          </button>
          {!isToday && (
            <button
              onClick={() => setSelDate(new Date())}
              className="rounded-[10px] border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1.5 text-[12px] font-semibold text-[#f5c518]"
            >
              Today
            </button>
          )}
          <button
            onClick={() => setEditTask(blankTaskAt(kids[0]?.id ?? ""))}
            className="rounded-[10px] bg-[#f5c518] px-3 py-1.5 text-[12px] font-semibold text-[#0f0f1a]"
          >
            + New Task
          </button>
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border border-border bg-surface ${
          fill ? "flex min-h-0 flex-1 flex-col" : ""
        }`}
      >
        {!hideColumnHeaders && (
          <div
            className="sticky top-0 z-20 grid shrink-0 border-b border-border bg-surface"
            style={{
              gridTemplateColumns: `44px repeat(${colCount || 1}, 1fr)`,
            }}
          >
            <div />
            {kidData.map((kid, idx) => (
              <div
                key={kid.id}
                className="flex items-center gap-1.5 border-l border-border px-2 py-2.5 text-[13px] font-bold"
                style={{ color: kidColors[idx % kidColors.length] }}
              >
                <span className="text-[16px]">{kid.avatar_emoji}</span>
                {kid.name}
              </div>
            ))}
          </div>
        )}

        <div
          ref={scrollRef}
          className={fill ? "min-h-0 flex-1 overflow-y-auto" : "overflow-y-auto"}
          style={fill ? undefined : { maxHeight: "62vh" }}
        >
          <div className="relative" style={{ height: totalH }}>
            <div
              className="grid h-full"
              style={{
                gridTemplateColumns: `44px repeat(${colCount || 1}, 1fr)`,
              }}
            >
              <div className="relative bg-surface">
                {CAL_HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1.5 select-none text-[11px]"
                    style={{
                      top: (h - CAL_START) * pxh - 8,
                      color:
                        h === new Date().getHours() && isToday
                          ? "#f5c518"
                          : "#475569",
                      fontWeight:
                        h === new Date().getHours() && isToday ? 700 : 400,
                    }}
                  >
                    {hourLabel(h)}
                  </div>
                ))}
              </div>

              {kidData.map((kid) => (
                <div
                  key={kid.id}
                  className="relative border-l border-border"
                  onClick={(e) => openNewTaskAt(e, kid.id)}
                  onContextMenu={(e) => openCtxMenu(e, kid.id)}
                >
                  {CAL_HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 h-px"
                      style={{
                        top: (h - CAL_START) * pxh,
                        background:
                          h % 2 === 0
                            ? "var(--border)"
                            : "transparent",
                      }}
                    />
                  ))}

                  <div className="absolute bottom-0 left-1/2 top-0 z-[1] w-px bg-surface" />

                  {layoutTasks(kid.sessions || []).map(
                    ({ task, col, totalCols }) => {
                      const comp = kid.completions.find(
                        (c) => c.task_id === task.id,
                      );
                      const status = taskStatus(task, comp);
                      const meta = STATUS_META[status] || STATUS_META.upcoming;
                      const top = timeToY(task.start_time, pxh);
                      const h = blockHeight(task);
                      const isMissed = status === "missed";
                      const isPending = status === "pending";
                      const totalSecs = kid.runsByTask?.[task.id] || 0;
                      const scheduledMins = task.target_duration
                        ? Math.round(task.target_duration / 60)
                        : null;
                      const GAP = 2;
                      const halfW = 50;
                      const laneW = `calc(${halfW / totalCols}% - ${GAP}px)`;
                      const laneLeft = `calc(${
                        (col / totalCols) * halfW
                      }% + ${GAP / 2}px)`;
                      const isDragging = drag?.taskId === task.id;
                      const previewMin = isDragging
                        ? Math.max(
                            CAL_START * 60,
                            Math.min(
                              CAL_END * 60 - drag.spanMin,
                              Math.round(
                                (drag.origStartMin + drag.deltaPx / pxm) /
                                  SNAP_MIN,
                              ) * SNAP_MIN,
                            ),
                          )
                        : 0;
                      return (
                        <div
                          key={task.id}
                          onPointerDown={(e) => beginPress(task, e)}
                          onContextMenu={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dragMovedRef.current) {
                              dragMovedRef.current = false;
                              return;
                            }
                            if (canApprove) setSheet({ task, comp, kid });
                            else handleKidTap(task, kid, comp);
                          }}
                          className={`absolute z-[5] select-none rounded-[5px] px-1.5 py-1 ${
                            isDragging ? "overflow-visible" : "overflow-hidden"
                          }`}
                          style={{
                            top,
                            height: h,
                            left: laneLeft,
                            width: laneW,
                            transform: isDragging
                              ? `translateY(${drag.deltaPx}px)`
                              : undefined,
                            touchAction: isDragging ? "none" : undefined,
                            cursor: isDragging ? "grabbing" : "grab",
                            zIndex: isDragging ? 20 : 5,
                            background:
                              status === "done"
                                ? meta.bg
                                : "rgba(79,142,247,0.14)",
                            border: `1px solid ${
                              status === "done"
                                ? meta.color + "44"
                                : "rgba(79,142,247,0.4)"
                            }`,
                            borderLeft: `3px solid ${
                              status === "done" ? meta.color : "#4f8ef7"
                            }`,
                            opacity: isMissed ? 0.65 : isDragging ? 0.92 : 1,
                            boxShadow: isDragging
                              ? "0 6px 20px rgba(0,0,0,0.45)"
                              : isPending
                              ? `0 0 0 1px ${meta.color}66`
                              : "none",
                            boxSizing: "border-box",
                          }}
                        >
                          {isDragging && (
                            <div className="absolute -top-4 left-0 rounded bg-[#4f8ef7] px-1 text-[10px] font-bold text-white">
                              {beehave.formatTime(minutesToTime(previewMin))}
                            </div>
                          )}
                          <div className="flex h-full items-start gap-1">
                            <span
                              className="shrink-0 leading-[1.3]"
                              style={{
                                fontSize: h < 50 ? 14 : 17,
                                fontFamily: EMOJI_FONT,
                              }}
                            >
                              {task.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div
                                className="overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-[1.25] text-foreground"
                                style={{
                                  fontSize: h < 50 ? 13 : 15,
                                  textDecoration: isMissed
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {task.name}
                              </div>
                              {h >= 52 && (
                                <div className="mt-0.5 text-[12px] text-muted">
                                  {beehave.formatTime(task.start_time)}
                                </div>
                              )}
                              {h >= 52 && totalSecs > 0 && scheduledMins && (
                                <div className="mt-px text-[12px] text-[#4f8ef7]">
                                  ⏱ {Math.round(totalSecs / 60)}/{scheduledMins}m
                                </div>
                              )}
                            </div>
                            {h >= 36 && (
                              <span className="shrink-0 text-[12px]">
                                {meta.icon}
                              </span>
                            )}
                            {canApprove && comp && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void undoCompletion(comp);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                title="Undo completion"
                                className="ml-1 shrink-0 self-start rounded-md bg-black/35 px-1.5 py-0.5 text-[13px] font-bold leading-none hover:bg-black/50"
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}

                  {stackQuickTasks(kid.quickTasks || [], pxh).map(({ task, y }) => {
                    const comp = kid.completions.find(
                      (c) => c.task_id === task.id,
                    );
                    const status = taskStatus(task, comp);
                    const meta = STATUS_META[status] || STATUS_META.upcoming;
                    const isMissed = status === "missed";
                    const isPending = status === "pending";
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canApprove) setSheet({ task, comp, kid });
                          else handleKidTap(task, kid, comp);
                        }}
                        onContextMenu={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="absolute z-[5] flex cursor-pointer items-center gap-1 overflow-hidden rounded-sm px-[3px]"
                        style={{
                          top: y,
                          height: QUICK_TASK_H,
                          left: "calc(50% + 2px)",
                          right: 2,
                          background: meta.bg,
                          border: `1px solid ${meta.color}33`,
                          borderLeft: `2px solid ${meta.color}`,
                          opacity: isMissed ? 0.55 : 1,
                          boxShadow: isPending
                            ? `0 0 0 1px ${meta.color}55`
                            : "none",
                          boxSizing: "border-box",
                        }}
                      >
                        <span
                          className="shrink-0 text-[12px] leading-none"
                          style={{ fontFamily: EMOJI_FONT }}
                        >
                          {task.icon}
                        </span>
                        <div
                          className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-none"
                          style={{
                            color: meta.color,
                            textDecoration: isMissed ? "line-through" : "none",
                          }}
                        >
                          {task.name}
                        </div>
                        {canApprove && comp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void undoCompletion(comp);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Undo completion"
                            className="ml-1 shrink-0 rounded bg-black/30 px-1 py-0.5 text-[12px] font-bold leading-none hover:bg-black/45"
                          >
                            ↩
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {isToday && nowY !== null && (
              <div
                className="pointer-events-none absolute left-11 right-0 z-[15] h-0.5 bg-[#ef4444]"
                style={{ top: nowY }}
              >
                <div
                  className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-full bg-[#ef4444]"
                  style={{ boxShadow: "0 0 6px #ef4444" }}
                />
              </div>
            )}
          </div>

        </div>

        {/* Vertical zoom — fixed to the viewport corner so it's always
            reachable no matter how the calendar scrolls or how tall the
            app header wraps. */}
        <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex justify-end">
          <div className="pointer-events-auto flex flex-col items-stretch overflow-hidden rounded-xl border border-border bg-surface/95 shadow-xl backdrop-blur">
            <button
              onClick={() => nudgeZoom(0.2)}
              disabled={zoom >= CAL_ZOOM_MAX}
              title="Taller rows"
              className="px-3 py-2 text-[18px] font-bold leading-none text-foreground disabled:opacity-30"
            >
              ＋
            </button>
            <div className="border-y border-border px-1 py-1 text-center text-[11px] font-bold tabular-nums text-muted">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={() => nudgeZoom(-0.2)}
              disabled={zoom <= CAL_ZOOM_MIN}
              title="Shorter rows"
              className="px-3 py-2 text-[18px] font-bold leading-none text-foreground disabled:opacity-30"
            >
              －
            </button>
          </div>
        </div>
      </div>

      {sheet && (
        <TaskSheet
          sheet={sheet}
          onClose={() => setSheet(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          canApprove={canApprove}
          onEdit={() => {
            setEditTask(sheet.task);
            setSheet(null);
          }}
          taskStatus={taskStatus}
        />
      )}

      {editTask && (
        <div
          onClick={() => setEditTask(null)}
          className="fixed inset-0 z-[310] flex items-end bg-black/[0.65]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-h-[88vh] w-full max-w-[600px] overflow-y-auto overflow-x-hidden rounded-t-[20px] border-t border-border bg-background px-4 pb-8 pt-4"
          >
            <TaskForm
              task={editTask}
              kids={kids}
              onSave={saveEditedTask}
              onCancel={() => setEditTask(null)}
              onDelete={
                editTask.id
                  ? () => void deleteEditedTask(editTask.id as string)
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-[320]"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className="fixed z-[321] overflow-hidden rounded-[10px] border border-border bg-surface text-[13px] shadow-xl"
            style={{
              left: Math.min(ctxMenu.x, window.innerWidth - 180),
              top: Math.min(ctxMenu.y, window.innerHeight - 100),
            }}
          >
            <div className="border-b border-border px-3 py-1.5 text-[11px] text-muted">
              {beehave.formatTime(
                minutesToTime(
                  Math.round(ctxMenu.startMin / SNAP_MIN) * SNAP_MIN,
                ),
              )}
            </div>
            <button
              onClick={() => {
                setEditTask(
                  blankTaskAt(ctxMenu.kidId, ctxMenu.startMin, false),
                );
                setCtxMenu(null);
              }}
              className="block w-full px-3 py-2 text-left hover:bg-background"
            >
              ✓ New task here
            </button>
            <button
              onClick={() => {
                setEditTask(
                  blankTaskAt(ctxMenu.kidId, ctxMenu.startMin, true),
                );
                setCtxMenu(null);
              }}
              className="block w-full px-3 py-2 text-left hover:bg-background"
            >
              ⏱ New session here
            </button>
          </div>
        </>
      )}

      {reschedule && (
        <div
          className="fixed inset-0 z-[330] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setReschedule(null);
            void loadData();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] rounded-2xl border border-border bg-surface p-4"
          >
            <div className="text-[15px] font-bold">
              Move “{reschedule.task.name}”
            </div>
            <div className="mb-3 mt-0.5 text-[13px] text-muted">
              to{" "}
              {beehave.formatTime(minutesToTime(reschedule.newStartMin))} —
              change…
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => void applyReschedule("single")}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] font-semibold"
              >
                Just {isToday ? "today" : dateLabel}
              </button>
              <button
                onClick={() => void applyReschedule("future")}
                className="rounded-xl bg-[#f5c518] px-4 py-2.5 text-[14px] font-semibold text-[#0f0f1a]"
              >
                This &amp; all future days
              </button>
              <button
                onClick={() => {
                  setReschedule(null);
                  void loadData();
                }}
                className="px-4 py-1 text-[13px] text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskSheet({
  sheet,
  onClose,
  onApprove,
  onReject,
  onEdit,
  taskStatus,
  canApprove = true,
}: {
  sheet: SheetState;
  onClose: () => void;
  onApprove: (coins: number) => void;
  onReject: () => void;
  onEdit: () => void;
  taskStatus: (task: TaskRow, comp?: CompletionRow) => string;
  canApprove?: boolean;
}) {
  const { task, comp, kid } = sheet;
  const status = taskStatus(task, comp);
  const meta = STATUS_META[status] || STATUS_META.upcoming;
  const isPending = status === "pending";
  const isSession =
    task.task_type === "session" || task.task_type === "focus";

  const defaultCoins = comp?.coins_earned ?? task.full_coins ?? 20;
  const [coins, setCoins] = useState(defaultCoins);
  const [note, setNote] = useState("");
  const [sessionRuns, setSessionRuns] = useState<
    { duration_secs?: number }[]
  >([]);

  useEffect(() => {
    if (!isSession || !supabase) return;
    const today = localDateStr(new Date());
    supabase
      .from("session_runs")
      .select("*")
      .eq("task_id", task.id)
      .eq("kid_id", kid.id)
      .eq("scheduled_date", today)
      .order("started_at")
      .then(({ data }) =>
        setSessionRuns((data as { duration_secs?: number }[]) || []),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const totalSessionSecs = sessionRuns.reduce(
    (s, r) => s + (r.duration_secs || 0),
    0,
  );
  const scheduledMins = task.target_duration
    ? Math.round(task.target_duration / 60)
    : null;

  const presetCoins = [0, task.min_coins, task.full_coins].filter(
    (v): v is number => v !== undefined && v !== null,
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-end bg-black/[0.65]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[70vh] w-full overflow-y-auto rounded-t-[20px] bg-surface px-4 pb-9 pt-2"
        style={{ borderTop: `3px solid ${meta.color}` }}
      >
        <div className="mx-auto mb-4 mt-2 h-1 w-9 rounded-sm bg-border" />

        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-[20px]"
            style={{ background: kid.avatar_color || "#4f8ef7" }}
          >
            {kid.avatar_emoji}
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted">{kid.name}</div>
            <div className="text-[17px] font-extrabold">
              <span style={{ fontFamily: EMOJI_FONT }}>{task.icon}</span>{" "}
              {task.name}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {beehave.formatTime(task.start_time)}
              {isSession &&
                task.target_duration &&
                ` → ${(() => {
                  const [sh, sm] = (task.start_time || "00:00")
                    .split(":")
                    .map(Number);
                  const total =
                    sh * 60 + sm + Math.round((task.target_duration || 0) / 60);
                  return `${String(Math.floor(total / 60) % 24).padStart(
                    2,
                    "0",
                  )}:${String(total % 60).padStart(2, "0")}`;
                })()}`}
              {!isSession &&
                task.expiry_time &&
                ` (expires ${beehave.formatTime(task.expiry_time)})`}
              {isSession && (
                <span className="ml-1.5 text-[#4f8ef7]">⏱ Session</span>
              )}
            </div>
            {isSession && totalSessionSecs > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#4f8ef7]/25 bg-[#4f8ef7]/10 px-2.5 py-1.5">
                <span className="text-[13px] font-bold text-[#4f8ef7]">
                  ⏱ {Math.round(totalSessionSecs / 60)} min studied
                  {scheduledMins && ` of ${scheduledMins} min`}
                </span>
                {totalSessionSecs >= (task.target_duration || 0) &&
                  (task.target_duration || 0) > 0 && (
                    <span className="text-[12px] text-[#f5c518]">
                      🏆 Full session!
                    </span>
                  )}
              </div>
            )}
          </div>
          <span
            className="rounded-[20px] px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.color}44`,
            }}
          >
            {meta.icon} {meta.label}
          </span>
        </div>

        {comp && comp.completed_at && (
          <div className="mb-3.5 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[13px] text-muted">
            Marked done at{" "}
            {new Date(comp.completed_at).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {comp.completion_count && ` · Completion #${comp.completion_count}`}
          </div>
        )}

        {canApprove && isPending && (
          <>
            <div className="mb-3.5">
              <p className="mb-2 text-[12px] text-muted">Coins to award</p>
              <div className="mb-2.5 flex items-center gap-3">
                <button
                  onClick={() => setCoins((c) => Math.max(0, c - 5))}
                  className="h-10 w-10 rounded-[10px] bg-surface text-[20px] font-bold text-white"
                >
                  −
                </button>
                <div className="flex-1 text-center text-[28px] font-black text-[#f5c518]">
                  🪙 {coins}
                </div>
                <button
                  onClick={() => setCoins((c) => c + 5)}
                  className="h-10 w-10 rounded-[10px] bg-surface text-[20px] font-bold text-white"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {presetCoins.map((v) => (
                  <button
                    key={v}
                    onClick={() => setCoins(v)}
                    className="rounded-[20px] px-3.5 py-[5px] text-[12px] font-semibold"
                    style={{
                      background:
                        coins === v
                          ? "rgba(245,197,24,0.2)"
                          : "var(--border)",
                      border: `1px solid ${
                        coins === v
                          ? "rgba(245,197,24,0.4)"
                          : "var(--border)"
                      }`,
                      color: coins === v ? "#f5c518" : "#94a3b8",
                    }}
                  >
                    {v === 0
                      ? "0 (none)"
                      : v === task.min_coins
                      ? `${v} (min)`
                      : `${v} (full)`}
                  </button>
                ))}
              </div>
            </div>

            <input
              placeholder="Note to kid (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mb-3 w-full rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
            />

            <div className="flex gap-2.5">
              <button
                onClick={onReject}
                className="flex-1 rounded-[10px] border border-[#ef4444]/30 bg-[#ef4444]/15 p-3.5 text-[15px] font-semibold text-[#ef4444]"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => onApprove(coins)}
                className="flex-[2] rounded-[10px] border border-[#22c55e]/30 bg-[#22c55e]/15 p-3.5 text-[15px] font-extrabold text-[#22c55e]"
              >
                ✅ Approve 🪙 {coins}
              </button>
            </div>
          </>
        )}

        {!isPending && (
          <div className="flex gap-2.5">
            {status === "done" && (
              <div className="flex-1 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-3 text-center">
                <div className="mb-1 text-[22px]">
                  🪙 {comp?.coins_earned ?? "—"}
                </div>
                <div className="text-[12px] text-muted">Coins earned</div>
              </div>
            )}
            {status === "missed" && (
              <div className="flex-1 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/[0.08] px-4 py-3 text-center">
                <div className="mb-1 text-[22px]">😔</div>
                <div className="text-[12px] text-muted">
                  Task was missed
                </div>
              </div>
            )}
            <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-center">
              <div className="mb-1 text-[14px] font-bold text-[#f5c518]">
                🪙 {task.full_coins}
              </div>
              <div className="text-[11px] text-muted">
                Full · {task.min_coins} Min
              </div>
              {(task.penalty_coins || 0) > 0 && (
                <div className="mt-0.5 text-[11px] text-[#ef4444]">
                  −{task.penalty_coins} Penalty
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 rounded-xl border border-[#f5c518]/40 bg-[#f5c518]/12 p-3 text-[14px] font-semibold text-[#f5c518]"
          >
            ✏️ Edit task
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-surface p-3 text-[14px] font-semibold text-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bar Chart for week / month ── */
function CompletionChart({
  data,
  period,
  kids,
  kidColors,
}: {
  data: ChartGroup[];
  period: "week" | "month";
  kids: KidRow[];
  kidColors: string[];
}) {
  const displayData: ChartGroup[] =
    period === "month"
      ? (() => {
          const weeks: ChartGroup[] = [];
          for (let i = 0; i < data.length; i += 7) {
            const chunk = data.slice(i, i + 7);
            const label = chunk[0].label;
            const kidTotals = kids.map((kid, idx) => ({
              name: kid.name,
              color: kidColors[idx % kidColors.length],
              done: chunk.reduce(
                (s, d) => s + (d.kids[idx]?.done || 0),
                0,
              ),
            }));
            weeks.push({ label, kids: kidTotals });
          }
          return weeks;
        })()
      : data;

  const barW = period === "week" ? 28 : 18;
  const groupGap = period === "week" ? 28 : 12;
  const kidGap = 3;
  const chartH = 140;
  const leftPad = 32;
  const rightPad = 12;
  const totalGroupW = kids.length * barW + (kids.length - 1) * kidGap;
  const totalW =
    leftPad + displayData.length * (totalGroupW + groupGap) + rightPad;

  const yMax = Math.max(
    1,
    ...displayData.flatMap((d) => d.kids.map((k) => k.done)),
  );

  return (
    <div className="rounded-2xl border border-border bg-surface px-3.5 pb-2.5 pt-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[14px] font-bold">
          {period === "week" ? "Weekly" : "Monthly"} Completion
        </span>
        <div className="flex gap-2.5">
          {kids.map((kid, idx) => (
            <div key={kid.id} className="flex items-center gap-1">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: kidColors[idx % kidColors.length] }}
              />
              <span className="text-[11px] text-muted">{kid.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={Math.max(totalW, 280)}
          height={chartH + 28}
          className="block"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = chartH - f * chartH + 4;
            return (
              <g key={f}>
                <line
                  x1={leftPad - 4}
                  y1={y}
                  x2={totalW - rightPad}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={leftPad - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill="#475569"
                >
                  {Math.round(f * yMax)}
                </text>
              </g>
            );
          })}

          {displayData.map((group, gi) => {
            const groupX = leftPad + gi * (totalGroupW + groupGap);
            return (
              <g key={gi}>
                {group.kids.map((k, ki) => {
                  const barH =
                    yMax > 0
                      ? Math.round((k.done / yMax) * (chartH - 8))
                      : 0;
                  const x = groupX + ki * (barW + kidGap);
                  const y = chartH - barH + 4;
                  return (
                    <g key={ki}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={3}
                        fill={k.color}
                        opacity={0.85}
                      />
                      {k.done > 0 && (
                        <text
                          x={x + barW / 2}
                          y={y - 3}
                          textAnchor="middle"
                          fontSize={9}
                          fill={k.color}
                          fontWeight="700"
                        >
                          {k.done}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  x={groupX + totalGroupW / 2}
                  y={chartH + 18}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  {group.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ APPROVE TAB ═══════════════════ */
function AwardCard({ kids }: { kids: KidRow[] }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const amount = parseInt(score, 10);
  const valid = !busy && Number.isFinite(amount) && amount !== 0 && !!kidId;

  async function award() {
    if (!supabase || !valid) return;
    setBusy(true);
    try {
      const { data: kid } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", kidId)
        .single();
      const before =
        (kid as { coin_balance?: number } | null)?.coin_balance || 0;
      await supabase
        .from("profiles")
        .update({ coin_balance: Math.max(0, before + amount) })
        .eq("id", kidId);
      await supabase.from("coin_transactions").insert({
        kid_id: kidId,
        amount,
        reason: note.trim() || (amount >= 0 ? "Bonus" : "Deduction"),
        transaction_type: amount >= 0 ? "bonus" : "penalty",
      });
      const k = kids.find((x) => x.id === kidId);
      setDone(`${amount >= 0 ? "+" : ""}${amount} 🪙 → ${k?.name ?? "kid"}`);
      setNote("");
      setScore("");
      setTimeout(() => setDone(""), 3000);
    } finally {
      setBusy(false);
    }
  }

  if (kids.length === 0) return null;

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[15px] font-bold">⭐ Award</span>

        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setKidId(k.id)}
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold"
            style={{
              background:
                kidId === k.id ? "rgba(245,197,24,0.18)" : "var(--surface)",
              border: `1px solid ${
                kidId === k.id ? "rgba(245,197,24,0.5)" : "var(--border)"
              }`,
              color: kidId === k.id ? "#f5c518" : "var(--muted)",
            }}
          >
            <span className="text-[14px]">{k.avatar_emoji}</span> {k.name}
          </button>
        ))}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (reason)"
          className="min-w-[110px] flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-foreground"
        />
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Score (– to deduct)"
          className="w-[140px] shrink-0 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-foreground"
        />
        <button
          onClick={award}
          disabled={!valid}
          className="shrink-0 rounded-[10px] bg-[#f5c518] px-5 py-2 text-[13px] font-semibold text-[#0f0f1a] disabled:opacity-40"
        >
          {busy ? "…" : "Award"}
        </button>
      </div>

      {done && (
        <div className="mt-2 text-[13px] font-semibold text-[#22c55e]">
          ✅ Awarded {done}
        </div>
      )}
    </div>
  );
}

function ApproveTab({
  onApprove,
  profile,
  kids,
}: {
  onApprove: () => void;
  profile: BeehaveProfile;
  kids: KidRow[];
}) {
  void kids;
  const [queue, setQueue] = useState<CompletionRow[]>([]);
  const [initiativeQueue, setInitiativeQueue] = useState<InitiativeRow[]>([]);

  useEffect(() => {
    void loadQueue();
    void loadInitiativeQueue();
  }, []);

  async function loadQueue() {
    if (!supabase) return;
    const { data } = await supabase
      .from("task_completions")
      .select("*, task:task_id(*), kid:kid_id(*)")
      .eq("status", "pending_approval")
      .order("created_at");
    setQueue((data as CompletionRow[]) || []);
  }

  async function loadInitiativeQueue() {
    if (!supabase) return;
    const { data } = await supabase
      .from("initiatives")
      .select("*, kid:kid_id(*)")
      .eq("status", "pending")
      .order("created_at");
    setInitiativeQueue((data as InitiativeRow[]) || []);
  }

  async function deletePhotoEvidence(comp: CompletionRow) {
    if (!comp.photo_path || !supabase) return;
    await supabase.storage.from("task-photos").remove([comp.photo_path]);
  }

  async function approve(comp: CompletionRow, adjustedCoins: number) {
    if (!supabase) return;
    await supabase
      .from("task_completions")
      .update({
        status: "approved",
        coins_earned: adjustedCoins,
        photo_path: null,
      })
      .eq("id", comp.id);
    await supabase.from("coin_transactions").insert({
      kid_id: comp.kid_id,
      amount: adjustedCoins,
      reason: `Approved: ${comp.task?.name}`,
      transaction_type: "task_reward",
      reference_id: comp.id,
    });
    const { data: kid } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", comp.kid_id)
      .single();
    await supabase
      .from("profiles")
      .update({
        coin_balance: Math.max(
          0,
          ((kid as { coin_balance?: number } | null)?.coin_balance || 0) +
            adjustedCoins,
        ),
      })
      .eq("id", comp.kid_id);
    await deletePhotoEvidence(comp);
    void loadQueue();
    onApprove();
  }

  async function reject(comp: CompletionRow) {
    if (!supabase) return;
    await supabase
      .from("task_completions")
      .update({ status: "rejected", photo_path: null })
      .eq("id", comp.id);
    await deletePhotoEvidence(comp);
    void loadQueue();
    onApprove();
  }

  async function deleteInitiativePhotos(init: InitiativeRow) {
    const paths = [init.before_photo_path, init.after_photo_path].filter(
      (p): p is string => Boolean(p),
    );
    if (paths.length && supabase)
      await supabase.storage.from("task-photos").remove(paths);
  }

  async function approveInitiative(init: InitiativeRow, coins: number) {
    if (!supabase) return;
    await supabase
      .from("initiatives")
      .update({
        status: "approved",
        coins_awarded: coins,
        decided_by: profile?.id,
        decided_at: new Date().toISOString(),
        before_photo_path: null,
        after_photo_path: null,
      })
      .eq("id", init.id);
    if (coins > 0) {
      await supabase.from("coin_transactions").insert({
        kid_id: init.kid_id,
        amount: coins,
        reason: "Initiative approved",
        transaction_type: "bonus",
        reference_id: init.id,
      });
      const { data: kid } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", init.kid_id)
        .single();
      await supabase
        .from("profiles")
        .update({
          coin_balance: Math.max(
            0,
            ((kid as { coin_balance?: number } | null)?.coin_balance || 0) +
              coins,
          ),
        })
        .eq("id", init.kid_id);
    }
    await deleteInitiativePhotos(init);
    void loadInitiativeQueue();
    onApprove();
  }

  async function rejectInitiative(init: InitiativeRow) {
    if (!supabase) return;
    await supabase
      .from("initiatives")
      .update({
        status: "rejected",
        decided_by: profile?.id,
        decided_at: new Date().toISOString(),
        before_photo_path: null,
        after_photo_path: null,
      })
      .eq("id", init.id);
    await deleteInitiativePhotos(init);
    void loadInitiativeQueue();
    onApprove();
  }

  return (
    <div>
      {queue.length > 0 && (
        <>
          <h2 className="mb-4 font-bold">
            Needs Your Review ({queue.length})
          </h2>
          {queue.map((comp) => (
            <ApprovalCard
              key={comp.id}
              comp={comp}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </>
      )}

      {initiativeQueue.length > 0 && (
        <>
          <h2
            className="mb-4 font-bold text-[#a855f7]"
            style={{ marginTop: queue.length > 0 ? 24 : 0 }}
          >
            🌟 Initiatives ({initiativeQueue.length})
          </h2>
          {initiativeQueue.map((init) => (
            <InitiativeCard
              key={init.id}
              initiative={init}
              onApprove={approveInitiative}
              onReject={rejectInitiative}
            />
          ))}
        </>
      )}
    </div>
  );
}

const cardCls =
  "mb-3 rounded-2xl border border-border bg-surface p-5";

function ApprovalCard({
  comp,
  onApprove,
  onReject,
}: {
  comp: CompletionRow;
  onApprove: (comp: CompletionRow, coins: number) => void;
  onReject: (comp: CompletionRow) => void;
}) {
  const [coins, setCoins] = useState(comp.coins_earned);
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!comp.photo_path || !supabase) return;
    let cancelled = false;
    supabase.storage
      .from("task-photos")
      .createSignedUrl(comp.photo_path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setPhotoUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [comp.photo_path]);

  const presets = [0, comp.task?.min_coins, comp.task?.full_coins].filter(
    (v): v is number => Boolean(v),
  );

  return (
    <div className={cardCls}>
      <div className="mb-3.5 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-[22px]"
          style={{ background: comp.kid?.avatar_color || "#4f8ef7" }}
        >
          {comp.kid?.avatar_emoji || "😊"}
        </div>
        <div>
          <div className="font-bold">{comp.kid?.name}</div>
          <div className="text-[13px] text-muted">
            {comp.task?.icon} {comp.task?.name}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            Completion #{comp.completion_count} ·{" "}
            {comp.completed_at &&
              new Date(comp.completed_at).toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </div>
          {comp.time_spent_secs != null && comp.task?.target_duration ? (
            (() => {
              const over = beehave.sessionOverran(
                comp.task as never,
                comp.time_spent_secs,
              );
              return (
                <div
                  className="mt-0.5 text-[12px] font-semibold"
                  style={{ color: over ? "#f97316" : "#4f8ef7" }}
                >
                  ⏱ ran {Math.round(comp.time_spent_secs / 60)} min /{" "}
                  {Math.round(comp.task.target_duration / 60)} min target
                  {over && " — 10+ min over"}
                </div>
              );
            })()
          ) : null}
        </div>
      </div>

      {comp.photo_path && (
        <div className="mb-3.5">
          <p className="mb-2 text-[13px] text-muted">📷 Photo evidence</p>
          {photoUrl ? (
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Task evidence"
                className="block max-h-[320px] w-full rounded-xl border border-border object-cover"
              />
            </a>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-muted">
              Loading photo…
            </div>
          )}
          <p className="mt-1.5 text-[10px] text-muted">
            Tap to view full size · deleted automatically once you approve or
            reject
          </p>
        </div>
      )}

      <div className="mb-3.5">
        <p className="mb-2 text-[13px] text-muted">Coins to award</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCoins((c) => Math.max(0, c - 5))}
            className="h-9 w-9 rounded-lg bg-surface text-[18px] text-white"
          >
            −
          </button>
          <div className="flex-1 text-center text-[24px] font-extrabold text-[#f5c518]">
            🪙 {coins}
          </div>
          <button
            onClick={() => setCoins((c) => c + 5)}
            className="h-9 w-9 rounded-lg bg-surface text-[18px] text-white"
          >
            +
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map((v) => (
            <button
              key={v}
              onClick={() => setCoins(v)}
              className="rounded-[20px] px-3 py-1 text-[12px]"
              style={{
                background:
                  coins === v
                    ? "rgba(245,197,24,0.2)"
                    : "var(--border)",
                border: `1px solid ${
                  coins === v
                    ? "rgba(245,197,24,0.4)"
                    : "var(--border)"
                }`,
                color: coins === v ? "#f5c518" : "#94a3b8",
              }}
            >
              {v === 0
                ? "0 (none)"
                : v === comp.task?.min_coins
                ? `${v} (min)`
                : `${v} (full)`}
            </button>
          ))}
        </div>
      </div>

      <input
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-3 w-full rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onReject(comp)}
          className="flex-1 rounded-[10px] border border-[#ef4444]/30 bg-[#ef4444]/15 px-6 py-3 font-semibold text-[#ef4444]"
        >
          Reject
        </button>
        <button
          onClick={() => onApprove(comp, coins)}
          className="flex-[2] rounded-[10px] border border-[#22c55e]/30 bg-[#22c55e]/15 px-6 py-3 font-semibold text-[#22c55e]"
        >
          Approve 🪙 {coins}
        </button>
      </div>
    </div>
  );
}

function InitiativeCard({
  initiative,
  onApprove,
  onReject,
}: {
  initiative: InitiativeRow;
  onApprove: (init: InitiativeRow, coins: number) => void;
  onReject: (init: InitiativeRow) => void;
}) {
  const [coins, setCoins] = useState(20);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (initiative.before_photo_path && supabase) {
      supabase.storage
        .from("task-photos")
        .createSignedUrl(initiative.before_photo_path, 3600)
        .then(({ data }) => {
          if (!cancelled && data?.signedUrl) setBeforeUrl(data.signedUrl);
        });
    }
    if (initiative.after_photo_path && supabase) {
      supabase.storage
        .from("task-photos")
        .createSignedUrl(initiative.after_photo_path, 3600)
        .then(({ data }) => {
          if (!cancelled && data?.signedUrl) setAfterUrl(data.signedUrl);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [initiative.before_photo_path, initiative.after_photo_path]);

  return (
    <div className={`${cardCls} border-[#a855f7]/25`}>
      <div className="mb-3.5 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-[22px]"
          style={{ background: initiative.kid?.avatar_color || "#4f8ef7" }}
        >
          {initiative.kid?.avatar_emoji || "😊"}
        </div>
        <div>
          <div className="font-bold">{initiative.kid?.name}</div>
          <div className="text-[13px] text-[#a855f7]">
            🌟 Started their own initiative
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            {initiative.created_at &&
              new Date(initiative.created_at).toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </div>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2">
        {(
          [
            ["Before", beforeUrl],
            ["After", afterUrl],
          ] as const
        ).map(([label, url]) => (
          <div key={label}>
            <p className="mb-1.5 text-center text-[11px] text-muted">
              {label}
            </p>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={label}
                  className="block h-40 w-full rounded-xl border border-border object-cover"
                />
              </a>
            ) : (
              <div className="h-40 rounded-xl border border-border bg-surface" />
            )}
          </div>
        ))}
      </div>
      <p className="-mt-2 mb-3.5 text-[10px] text-muted">
        Tap a photo to view full size · deleted automatically once you approve or
        reject
      </p>

      {initiative.note && (
        <div className="mb-3.5 rounded-lg bg-surface px-2.5 py-2 text-[13px] italic text-foreground">
          &quot;{initiative.note}&quot;
        </div>
      )}

      <div className="mb-3.5">
        <p className="mb-2 text-[13px] text-muted">Coins to award</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCoins((c) => Math.max(0, c - 5))}
            className="h-9 w-9 rounded-lg bg-surface text-[18px] text-white"
          >
            −
          </button>
          <div className="flex-1 text-center text-[24px] font-extrabold text-[#f5c518]">
            🪙 {coins}
          </div>
          <button
            onClick={() => setCoins((c) => c + 5)}
            className="h-9 w-9 rounded-lg bg-surface text-[18px] text-white"
          >
            +
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 10, 20, 30].map((v) => (
            <button
              key={v}
              onClick={() => setCoins(v)}
              className="rounded-[20px] px-3 py-1 text-[12px]"
              style={{
                background:
                  coins === v
                    ? "rgba(245,197,24,0.2)"
                    : "var(--border)",
                border: `1px solid ${
                  coins === v
                    ? "rgba(245,197,24,0.4)"
                    : "var(--border)"
                }`,
                color: coins === v ? "#f5c518" : "#94a3b8",
              }}
            >
              {v === 0 ? "0 (none)" : v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onReject(initiative)}
          className="flex-1 rounded-[10px] border border-[#ef4444]/30 bg-[#ef4444]/15 px-6 py-3 font-semibold text-[#ef4444]"
        >
          Reject
        </button>
        <button
          onClick={() => onApprove(initiative, coins)}
          className="flex-[2] rounded-[10px] border border-[#22c55e]/30 bg-[#22c55e]/15 px-6 py-3 font-semibold text-[#22c55e]"
        >
          Approve 🪙 {coins}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ TASKS TAB ═════════════════════ */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Thin wrapper kept for the standalone ?tab=Task page. The body now lives in
// TaskManagerPanel so the Overview "All tasks" mode can reuse it verbatim.
function TasksTab({ kids }: { kids: KidRow[] }) {
  return <TaskManagerPanel kids={kids} />;
}

function TaskManagerPanel({ kids }: { kids: KidRow[] }) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [pendingKidTasks, setPendingKidTasks] = useState<TaskRow[]>([]);
  const [form, setForm] = useState<Partial<TaskRow> | null>(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);
  // Double-click a list item to edit it. (Delete lives inside the editor.)
  function rowGesture(onEdit: () => void) {
    return { onDoubleClick: onEdit };
  }

  useEffect(() => {
    void loadTasks();
    void loadPendingKidTasks();
  }, []);

  async function loadTasks() {
    if (!supabase) return;
    const { data } = await supabase
      .from("tasks")
      .select("*, kid:assigned_to(name, avatar_emoji)")
      .neq("is_active", false)
      .order("start_time");
    setTasks((data as TaskRow[]) || []);
  }

  async function loadPendingKidTasks() {
    if (!supabase) return;
    const { data } = await supabase
      .from("tasks")
      .select("*, kid:assigned_to(name, avatar_emoji)")
      .eq("pending_parent_review", true)
      .order("created_at", { ascending: false });
    setPendingKidTasks((data as TaskRow[]) || []);
  }

  async function approveKidTask(task: TaskRow) {
    if (!supabase) return;
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: true, pending_parent_review: false })
      .eq("id", task.id);
    if (error) {
      alert("Approve failed: " + error.message);
      return;
    }
    void loadPendingKidTasks();
    void loadTasks();
  }

  async function rejectKidTask(task: TaskRow) {
    if (!supabase) return;
    if (!confirm(`Reject "${task.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      alert("Reject failed: " + error.message);
      return;
    }
    void loadPendingKidTasks();
  }

  async function saveTask(task: Partial<TaskRow>) {
    if (!supabase) return;
    let error;
    if (task.id) {
      ({ error } = await supabase
        .from("tasks")
        .update({ ...task, is_active: true })
        .eq("id", task.id)
        .select());
    } else {
      ({ error } = await supabase
        .from("tasks")
        .insert({ ...task, is_active: true })
        .select());
    }
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    setForm(null);
    void loadTasks();
  }

  async function deleteTask(id: string) {
    if (!supabase) return;
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    void loadTasks();
  }

  function exportToExcel() {
    const rows = tasks.map((t) => {
      const isSession =
        t.task_type === "session" || t.task_type === "focus";
      return {
        name: t.name,
        icon: t.icon,
        assigned_to: t.kid?.name || "",
        days: (t.days_of_week || []).map((d) => DAY_NAMES[d]).join(","),
        start_date: t.start_date || "",
        end_date: t.end_date || "",
        start_time: t.start_time,
        end_time:
          isSession && t.target_duration
            ? (() => {
                const [sh, sm] = (t.start_time || "00:00")
                  .split(":")
                  .map(Number);
                const total =
                  sh * 60 + sm + Math.round(t.target_duration / 60);
                return `${String(Math.floor(total / 60) % 24).padStart(
                  2,
                  "0",
                )}:${String(total % 60).padStart(2, "0")}`;
              })()
            : "",
        expiry_time: !isSession ? t.expiry_time || "" : "",
        full_coins: t.full_coins,
        min_coins: t.min_coins,
        penalty_coins: t.penalty_coins,
        approval: t.approval || "auto",
        task_type: t.task_type || "task",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [20, 8, 14, 20, 12, 12, 14, 14, 12, 10, 14, 10].map((w) => ({
      wch: w,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "beehave-tasks.xlsx");
  }

  function excelTimeToHHMM(val: unknown): string | null {
    if (!val && val !== 0) return null;
    if (typeof val === "string" && val.includes(":")) return val.trim();
    if (typeof val === "number") {
      const totalMinutes = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return String(val).trim() || null;
  }

  async function importFromExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setImporting(true);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const kid = kids.find(
          (k) =>
            k.name.toLowerCase() ===
            String(row.assigned_to || "").toLowerCase(),
        );
        if (!kid || !row.name) {
          skipped++;
          continue;
        }
        const days = String(row.days || "")
          .split(",")
          .map((d) => DAY_NAMES.indexOf(d.trim()))
          .filter((d) => d >= 0);

        const hasEndTime =
          !!row.end_time && String(row.end_time).trim().length > 0;
        const typeFromCol = String(row.task_type || "").toLowerCase();
        const isSession = hasEndTime || typeFromCol === "session";

        const startTime = excelTimeToHHMM(row.start_time) || "07:00";
        const endTime = hasEndTime ? excelTimeToHHMM(row.end_time) : null;

        let targetDuration: number | null = null;
        if (isSession && startTime && endTime) {
          const [sh, sm] = startTime.split(":").map(Number);
          const [eh, em] = endTime.split(":").map(Number);
          const secs = (eh * 60 + em - sh * 60 - sm) * 60;
          if (secs > 0) targetDuration = secs;
        }

        const approvalVal =
          String(row.approval || "").toLowerCase() === "review"
            ? "review"
            : "auto";
        await supabase.from("tasks").insert({
          name: String(row.name),
          icon: String(row.icon || "⭐"),
          assigned_to: kid.id,
          days_of_week: days,
          start_time: startTime,
          start_date: row.start_date ? String(row.start_date) : null,
          end_date: row.end_date ? String(row.end_date) : null,
          expiry_time: isSession
            ? null
            : excelTimeToHHMM(row.expiry_time) || "08:00",
          note: row.note ? String(row.note) : null,
          full_coins: parseInt(String(row.full_coins)) || 20,
          min_coins: parseInt(String(row.min_coins)) || 5,
          penalty_coins: parseInt(String(row.penalty_coins)) || 10,
          approval: approvalVal,
          task_type: isSession ? "session" : "task",
          target_duration: targetDuration,
          is_active: true,
        });
        imported++;
      }
      alert(
        `✅ Imported ${imported} task${imported !== 1 ? "s" : ""}${
          skipped ? ` (${skipped} skipped — unknown kid name)` : ""
        }.`,
      );
      void loadTasks();
    } catch (err) {
      alert("Import failed: " + (err as Error).message);
    }
    setImporting(false);
    e.target.value = "";
  }

  if (form !== null)
    return (
      <TaskForm
        task={form}
        kids={kids}
        onSave={saveTask}
        onCancel={() => setForm(null)}
        onDelete={
          form.id
            ? async () => {
                await deleteTask(form.id as string);
                setForm(null);
              }
            : undefined
        }
      />
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">Tasks</h2>
        <div className="flex gap-2">
          {tasks.length > 0 && (
            <button
              onClick={async () => {
                if (!supabase) return;
                if (
                  !confirm(
                    `Delete all ${tasks.length} tasks? This cannot be undone.`,
                  )
                )
                  return;
                const { error } = await supabase
                  .from("tasks")
                  .update({ is_active: false })
                  .not("id", "is", null);
                if (error) {
                  alert("Clear All failed: " + error.message);
                  return;
                }
                void loadTasks();
              }}
              className="rounded-[10px] border border-[#ef4444]/30 bg-[#ef4444]/12 px-[18px] py-2.5 text-[14px] font-semibold text-[#ef4444]"
            >
              🗑 Clear All
            </button>
          )}
          <button
            onClick={() => setForm({})}
            className="rounded-[10px] bg-[#f5c518] px-[18px] py-2.5 text-[14px] font-semibold text-[#0f0f1a]"
          >
            + New Task
          </button>
        </div>
      </div>

      {pendingKidTasks.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2.5 font-bold text-[#a855f7]">
            💡 Pending from kids ({pendingKidTasks.length})
          </h3>
          {pendingKidTasks.map((task) => (
            <div
              key={task.id}
              className={`${cardCls} mb-2.5 border-[#a855f7]/25 bg-[#a855f7]/[0.06]`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="shrink-0 text-[28px]"
                  style={{ fontFamily: EMOJI_FONT }}
                >
                  {task.icon}
                </span>
                <div className="flex-1">
                  <div className="font-bold">{task.name}</div>
                  <div className="text-[13px] text-muted">
                    {task.kid?.avatar_emoji} {task.kid?.name} · wants to start{" "}
                    {beehave.formatTime(task.start_time)}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#f5c518]">
                    🪙 suggested {task.full_coins} coins
                  </div>
                </div>
              </div>
              {task.note && (
                <div className="mt-2.5 rounded-lg bg-surface px-2.5 py-2 text-[13px] italic text-foreground">
                  &quot;{task.note}&quot;
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => rejectKidTask(task)}
                  className="flex-1 rounded-[10px] border border-[#ef4444]/30 bg-[#ef4444]/15 px-6 py-3 font-semibold text-[#ef4444]"
                >
                  Reject
                </button>
                <button
                  onClick={() => approveKidTask(task)}
                  className="flex-[2] rounded-[10px] border border-[#22c55e]/30 bg-[#22c55e]/15 px-6 py-3 font-semibold text-[#22c55e]"
                >
                  Approve ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
        <span className="flex-1 text-[13px] text-muted">📊 Excel</span>
        <button
          onClick={exportToExcel}
          disabled={tasks.length === 0}
          className="rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/12 px-3.5 py-1.5 text-[13px] text-[#22c55e] disabled:opacity-50"
        >
          ↓ Export
        </button>
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-[#4f8ef7]/25 bg-[#4f8ef7]/12 px-3.5 py-1.5 text-[13px] text-[#4f8ef7] disabled:opacity-50"
        >
          {importing ? "Importing…" : "↑ Import"}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={importFromExcel}
        />
      </div>

      <p className="mb-2 px-1 text-[11px] text-muted">
        Tap Edit, or double-click a task
      </p>
      {tasks.map((task) => (
        <div
          key={task.id}
          {...rowGesture(() => setForm(task))}
          className={`${cardCls} flex cursor-pointer select-none items-center gap-3`}
        >
          <span
            className="shrink-0 text-[28px]"
            style={{ fontFamily: EMOJI_FONT }}
          >
            {task.icon}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{task.name}</span>
              {task.task_type === "session" || task.task_type === "focus" ? (
                <span className="rounded-[10px] border border-[#4f8ef7]/30 bg-[#4f8ef7]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#4f8ef7]">
                  ⏱ Session
                </span>
              ) : (
                <span className="rounded-[10px] border border-[#22c55e]/25 bg-[#22c55e]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#22c55e]">
                  ✓ Task
                </span>
              )}
              {task.requires_approval ? (
                <span className="rounded-[10px] border border-[#a855f7]/30 bg-[#a855f7]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a855f7]">
                  👀 Review
                </span>
              ) : null}
              {task.requires_photo ? (
                <span className="rounded-[10px] border border-[#a855f7]/30 bg-[#a855f7]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a855f7]">
                  📷 Photo
                </span>
              ) : null}
            </div>
            <div className="text-[13px] text-muted">
              {task.kid?.avatar_emoji} {task.kid?.name} ·{" "}
              {beehave.formatTime(task.start_time)}
            </div>
            <div className="mt-0.5 text-[12px] text-[#f5c518]">
              🪙 {task.full_coins} full · {task.min_coins} min · −
              {task.penalty_coins} penalty
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setForm(task);
            }}
            className="shrink-0 rounded-lg border border-[#f5c518]/40 bg-[#f5c518]/12 px-3 py-1.5 text-[13px] font-semibold text-[#f5c518]"
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

function TaskFormIconRow({
  icon,
  children,
  noBorder,
}: {
  icon: string;
  children: ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3.5 py-3"
      style={{
        borderBottom: noBorder ? "none" : "1px solid var(--border)",
      }}
    >
      <span className="mt-0.5 w-[22px] shrink-0 text-center text-[18px] opacity-60">
        {icon}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

type RepeatFreq = "none" | "day" | "week" | "month" | "year";

type TaskFormState = {
  name: string;
  icon: string;
  description: string;
  assigned_to: string;
  days_of_week: number[];
  start_date: string;
  start_time: string;
  session_end_time: string;
  expiry_time: string;
  full_coins: number;
  min_coins: number;
  penalty_coins: number;
  approval: string;
  requires_photo: boolean;
  id?: string;
  task_type: string;
  note: string;
  // Recurrence
  repeat_freq: RepeatFreq;
  repeat_interval: number;
  ends_mode: "never" | "on" | "after";
  end_date: string;
  repeat_count: number;
};

function TaskForm({
  task,
  kids,
  onSave,
  onCancel,
  onDelete,
}: {
  task: Partial<TaskRow>;
  kids: KidRow[];
  onSave: (task: Partial<TaskRow>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = localDateStr(new Date());
  const [form, setForm] = useState<TaskFormState>({
    name: task.name || "",
    icon: task.icon || "⭐",
    description: task.description || "",
    assigned_to: task.assigned_to || kids[0]?.id || "",
    days_of_week:
      task.days_of_week && task.days_of_week.length
        ? task.days_of_week
        : [1, 2, 3, 4, 5],
    start_date: task.start_date || todayStr,
    start_time: task.start_time || "07:00",
    session_end_time: task.target_duration
      ? (() => {
          const [sh, sm] = (task.start_time || "07:00")
            .split(":")
            .map(Number);
          const total =
            sh * 60 + sm + Math.round((task.target_duration || 0) / 60);
          return `${String(Math.floor(total / 60) % 24).padStart(
            2,
            "0",
          )}:${String(total % 60).padStart(2, "0")}`;
        })()
      : "07:30",
    expiry_time: task.expiry_time || "08:00",
    full_coins: task.full_coins || 20,
    min_coins: task.min_coins || 5,
    penalty_coins: task.penalty_coins || 10,
    approval: task.approval || "auto",
    requires_photo: task.requires_photo || false,
    id: task.id,
    task_type: task.task_type || "task",
    note: task.note || "",
    repeat_freq: (task.repeat_freq as RepeatFreq) || "week",
    repeat_interval: Math.max(1, Number(task.repeat_interval) || 1),
    ends_mode: task.repeat_count ? "after" : task.end_date ? "on" : "never",
    end_date: task.end_date || "",
    repeat_count: Number(task.repeat_count) || 13,
  });
  const [showRepeat, setShowRepeat] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter((x) => x !== d)
        : [...f.days_of_week, d],
    }));
  }

  const formIsSession = form.task_type === "session";

  function computeTargetDuration(
    startTime: string,
    endTime: string,
  ): number | null {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const secs = (eh * 60 + em - sh * 60 - sm) * 60;
    return secs > 0 ? secs : null;
  }

  function setPreset(freq: RepeatFreq, interval = 1, days?: number[]) {
    setForm((f) => ({
      ...f,
      repeat_freq: freq,
      repeat_interval: interval,
      ...(days ? { days_of_week: days } : {}),
    }));
  }

  const repeatSummary = recurrenceSummary({
    repeat_freq: form.repeat_freq,
    repeat_interval: form.repeat_interval,
    days_of_week: form.days_of_week,
    end_date: form.ends_mode === "on" ? form.end_date : null,
    repeat_count: form.ends_mode === "after" ? form.repeat_count : null,
  });

  function handleSave() {
    const freq = form.repeat_freq;
    const once = freq === "none";
    const weekly = freq === "week";
    const anchorDow = ymdToNoon(form.start_date || todayStr).getDay();
    const dow = weekly
      ? form.days_of_week.length
        ? form.days_of_week
        : [1, 2, 3, 4, 5]
      : once
      ? [anchorDow]
      : [0, 1, 2, 3, 4, 5, 6];
    const taskData: Partial<TaskRow> = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name,
      description: form.description || null,
      icon: form.icon,
      note: form.note || null,
      assigned_to: form.assigned_to,
      days_of_week: dow,
      start_date: form.start_date || null,
      end_date: once
        ? form.start_date || null
        : form.ends_mode === "on"
        ? form.end_date || null
        : null,
      repeat_freq: freq,
      repeat_interval: Math.max(1, form.repeat_interval || 1),
      repeat_count:
        !once && form.ends_mode === "after"
          ? Math.max(1, form.repeat_count || 1)
          : null,
      start_time: form.start_time,
      expiry_time: formIsSession ? null : form.expiry_time || "08:00",
      full_coins: form.full_coins,
      min_coins: form.min_coins,
      penalty_coins: form.penalty_coins,
      approval: form.approval || "auto",
      requires_photo: form.requires_photo,
      task_type: formIsSession ? "session" : "task",
      target_duration: formIsSession
        ? computeTargetDuration(form.start_time, form.session_end_time)
        : null,
    };
    onSave(taskData);
  }

  const IconRow = TaskFormIconRow;
  const inputCls =
    "w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] text-foreground";

  return (
    <div className="pb-4">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <button
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-[16px] text-muted"
        >
          ✕
        </button>
        <h2 className="flex-1 text-[18px] font-extrabold">
          {form.id ? "Edit Task" : "New Task"}
        </h2>
        {form.id && onDelete && (
          <button
            onClick={onDelete}
            className="rounded-[10px] border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2.5 text-[14px] font-semibold text-[#ef4444]"
          >
            Delete
          </button>
        )}
        <button
          onClick={handleSave}
          className="rounded-[10px] bg-[#f5c518] px-6 py-2.5 text-[14px] font-semibold text-[#0f0f1a]"
        >
          {form.id ? "Save" : "Create"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface px-4 py-1">
        <IconRow icon="✏️">
          <div className="flex items-center gap-2">
            <EmojiPicker
              value={form.icon}
              onChange={(emoji) => setForm((f) => ({ ...f, icon: emoji }))}
            />
            <input
              value={form.name}
              placeholder="Task name"
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className="flex-1 border-0 border-b border-border bg-transparent px-1 py-2.5 text-[18px] font-bold text-foreground"
              autoFocus
            />
          </div>
        </IconRow>

        <IconRow icon="🎯">
          <div className="mb-2 text-[12px] text-muted">Type</div>
          <div className="flex gap-2">
            {[
              {
                value: "task",
                label: "✓ Task",
                desc: "Quick checkbox — tap Done",
                color: "#22c55e",
              },
              {
                value: "session",
                label: "⏱ Session",
                desc: "Timed focus — Start / Stop",
                color: "#4f8ef7",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, task_type: opt.value }))
                }
                className="flex-1 rounded-xl px-2 py-2.5 text-left"
                style={{
                  background:
                    form.task_type === opt.value
                      ? `${opt.color}15`
                      : "var(--surface)",
                  border: `1px solid ${
                    form.task_type === opt.value
                      ? opt.color + "55"
                      : "var(--border)"
                  }`,
                }}
              >
                <div
                  className="text-[13px] font-bold"
                  style={{
                    color:
                      form.task_type === opt.value ? opt.color : "#94a3b8",
                  }}
                >
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[10px] text-muted">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </IconRow>

        <IconRow icon="👤">
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() =>
                  setForm((f) => ({ ...f, assigned_to: k.id }))
                }
                className="flex items-center gap-1.5 rounded-[20px] px-3.5 py-2 text-[14px] font-semibold"
                style={{
                  background:
                    form.assigned_to === k.id
                      ? "rgba(245,197,24,0.18)"
                      : "var(--border)",
                  border: `1px solid ${
                    form.assigned_to === k.id
                      ? "rgba(245,197,24,0.5)"
                      : "var(--border)"
                  }`,
                  color: form.assigned_to === k.id ? "#f5c518" : "#94a3b8",
                }}
              >
                <span className="text-[16px]">{k.avatar_emoji}</span> {k.name}
              </button>
            ))}
          </div>
        </IconRow>

        <IconRow icon="🗓">
          <div className="mb-1 text-[12px] text-muted">Starts</div>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, start_date: e.target.value }))
            }
            className={inputCls}
          />
        </IconRow>

        <IconRow icon="🔁">
          <button
            type="button"
            onClick={() => setShowRepeat((s) => !s)}
            className="flex w-full items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5 text-left text-[14px] text-foreground"
          >
            <span>{repeatSummary}</span>
            <span className="text-[12px] text-muted">
              {showRepeat ? "▲" : "▼"}
            </span>
          </button>

          {showRepeat && (
            <div className="mt-2.5 rounded-[12px] border border-border bg-background p-3">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(
                  [
                    { label: "Does not repeat", fn: () => setPreset("none", 1) },
                    { label: "Daily", fn: () => setPreset("day", 1) },
                    {
                      label: "Weekdays",
                      fn: () => setPreset("week", 1, [1, 2, 3, 4, 5]),
                    },
                    {
                      label: "Weekly",
                      fn: () =>
                        setPreset(
                          "week",
                          1,
                          form.days_of_week.length
                            ? form.days_of_week
                            : [ymdToNoon(form.start_date || todayStr).getDay()],
                        ),
                    },
                    { label: "Monthly", fn: () => setPreset("month", 1) },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={p.fn}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {form.repeat_freq !== "none" && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-[13px]">
                    <span className="text-muted">Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      value={form.repeat_interval}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          repeat_interval: Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          ),
                        }))
                      }
                      className="w-14 rounded-lg border border-border bg-surface px-2 py-1.5 text-center"
                    />
                    <select
                      value={form.repeat_freq}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          repeat_freq: e.target.value as RepeatFreq,
                        }))
                      }
                      className="rounded-lg border border-border bg-surface px-2 py-1.5"
                    >
                      <option value="day">
                        {form.repeat_interval === 1 ? "day" : "days"}
                      </option>
                      <option value="week">
                        {form.repeat_interval === 1 ? "week" : "weeks"}
                      </option>
                      <option value="month">
                        {form.repeat_interval === 1 ? "month" : "months"}
                      </option>
                      <option value="year">
                        {form.repeat_interval === 1 ? "year" : "years"}
                      </option>
                    </select>
                  </div>

                  {form.repeat_freq === "week" && (
                    <div className="mb-3">
                      <div className="mb-1.5 text-[11px] text-muted">
                        Repeat on
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className="h-[34px] w-[34px] rounded-full text-[11px] font-bold"
                            style={{
                              background: form.days_of_week.includes(i)
                                ? "#4f8ef7"
                                : "var(--border)",
                              border: `1px solid ${
                                form.days_of_week.includes(i)
                                  ? "#4f8ef7"
                                  : "var(--border)"
                              }`,
                              color: form.days_of_week.includes(i)
                                ? "#fff"
                                : "var(--muted)",
                            }}
                          >
                            {d[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1.5 text-[11px] text-muted">Ends</div>
                    <div className="flex flex-col gap-2 text-[13px]">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ends"
                          checked={form.ends_mode === "never"}
                          onChange={() =>
                            setForm((f) => ({ ...f, ends_mode: "never" }))
                          }
                        />
                        Never
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ends"
                          checked={form.ends_mode === "on"}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              ends_mode: "on",
                              end_date: f.end_date || f.start_date,
                            }))
                          }
                        />
                        On
                        <input
                          type="date"
                          value={form.end_date}
                          min={form.start_date}
                          disabled={form.ends_mode !== "on"}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              end_date: e.target.value,
                              ends_mode: "on",
                            }))
                          }
                          className="rounded-lg border border-border bg-surface px-2 py-1 disabled:opacity-40"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ends"
                          checked={form.ends_mode === "after"}
                          onChange={() =>
                            setForm((f) => ({ ...f, ends_mode: "after" }))
                          }
                        />
                        After
                        <input
                          type="number"
                          min={1}
                          value={form.repeat_count}
                          disabled={form.ends_mode !== "after"}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              repeat_count: Math.max(
                                1,
                                parseInt(e.target.value) || 1,
                              ),
                              ends_mode: "after",
                            }))
                          }
                          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-center disabled:opacity-40"
                        />
                        occurrences
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </IconRow>

        <IconRow icon="⏰">
          <div className="mb-2 text-[12px] text-muted">Schedule</div>

          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex-1">
              <div className="mb-1 text-[10px] text-muted">Start</div>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            {formIsSession && (
              <>
                <div className="mt-4 shrink-0 text-[14px] text-muted">
                  →
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-[10px] text-[#4f8ef7]">
                    ⏱ Session end
                  </div>
                  <input
                    type="time"
                    value={form.session_end_time}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        session_end_time: e.target.value,
                      }))
                    }
                    className={inputCls}
                    style={{ borderColor: "rgba(79,142,247,0.3)" }}
                  />
                </div>
              </>
            )}
          </div>

          {formIsSession &&
            form.start_time &&
            form.session_end_time &&
            (() => {
              const dur = computeTargetDuration(
                form.start_time,
                form.session_end_time,
              );
              if (!dur || dur <= 0) return null;
              const mins = Math.round(dur / 60);
              return (
                <div className="mb-2.5 pl-0.5 text-[12px] text-[#4f8ef7]">
                  ⏱ {mins} minute session
                </div>
              );
            })()}

          {!formIsSession && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="mb-1 text-[10px] text-[#ef4444]">
                  ❌ Expires (missed after)
                </div>
                <input
                  type="time"
                  value={form.expiry_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiry_time: e.target.value }))
                  }
                  className={inputCls}
                  style={{ borderColor: "rgba(239,68,68,0.3)" }}
                />
              </div>
              <div className="flex-1" />
            </div>
          )}
        </IconRow>

        <IconRow icon="🪙">
          <div className="mb-2 text-[12px] text-muted">Coins</div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { label: "Full reward", key: "full_coins", accent: "#f5c518" },
                { label: "Minimum", key: "min_coins", accent: "#94a3b8" },
                {
                  label: "Penalty",
                  key: "penalty_coins",
                  accent: "#ef4444",
                },
              ] as const
            ).map(({ label, key, accent }) => (
              <div
                key={key}
                className="rounded-[10px] bg-surface px-2.5 pb-2 pt-2.5 text-center"
                style={{ border: `1px solid ${accent}22` }}
              >
                <div
                  className="mb-1.5 text-[10px] font-semibold"
                  style={{ color: accent }}
                >
                  {label}
                </div>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full border-0 bg-transparent text-center text-[20px] font-extrabold outline-none"
                  style={{ color: accent }}
                />
              </div>
            ))}
          </div>
        </IconRow>

        <IconRow icon="👀">
          <div className="mb-2 text-[12px] text-muted">Approval</div>
          <div className="flex gap-2">
            {[
              {
                value: "auto",
                label: "⚡ Auto",
                desc: "Coins land instantly",
                color: "#22c55e",
              },
              {
                value: "review",
                label: "👀 Review",
                desc: "You approve first",
                color: "#a855f7",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, approval: opt.value }))
                }
                className="flex-1 rounded-[10px] px-2 py-2.5 text-center"
                style={{
                  background:
                    form.approval === opt.value
                      ? `${opt.color}22`
                      : "var(--surface)",
                  border: `1px solid ${
                    form.approval === opt.value
                      ? opt.color + "66"
                      : "var(--border)"
                  }`,
                  color: form.approval === opt.value ? opt.color : "#94a3b8",
                }}
              >
                <div className="text-[13px] font-bold">{opt.label}</div>
                <div className="mt-0.5 text-[10px] opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </IconRow>

        <IconRow icon="📷">
          <div className="mb-2 text-[12px] text-muted">Photo evidence</div>
          <div className="flex gap-2">
            {[
              {
                value: false,
                label: "✓ No photo",
                desc: "Just tap Done",
                color: "var(--muted)",
              },
              {
                value: true,
                label: "📷 Required",
                desc: "Kid must attach a photo",
                color: "#a855f7",
              },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, requires_photo: opt.value }))
                }
                className="flex-1 rounded-[10px] px-2 py-2.5 text-center"
                style={{
                  background:
                    form.requires_photo === opt.value
                      ? `${opt.color}22`
                      : "var(--surface)",
                  border: `1px solid ${
                    form.requires_photo === opt.value
                      ? opt.color + "66"
                      : "var(--border)"
                  }`,
                  color:
                    form.requires_photo === opt.value ? opt.color : "#94a3b8",
                }}
              >
                <div className="text-[13px] font-bold">{opt.label}</div>
                <div className="mt-0.5 text-[10px] opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
          {form.requires_photo && (
            <div className="mt-1.5 pl-0.5 text-[11px] text-[#a855f7]">
              📷 Photo tasks always go to your Approve tab, even with Auto
              approval
            </div>
          )}
        </IconRow>

        <IconRow icon="📝" noBorder>
          <textarea
            placeholder="Add a note (visible to the kid)…"
            value={form.note}
            onChange={(e) =>
              setForm((f) => ({ ...f, note: e.target.value }))
            }
            rows={3}
            className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] text-foreground"
          />
        </IconRow>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] text-muted">{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════ REWARDS TAB ══════════════════ */
function RewardsTab({ kids }: { kids: KidRow[] }) {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAward, setShowAward] = useState(false);
  const [sortBy, setSortBy] = useState<RewardSort>("cheap");
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);

  // Double-click a list item to edit it. (Delete lives inside the editor.)
  function rowGesture(onEdit: () => void) {
    return { onDoubleClick: onEdit };
  }
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    icon: string;
    coin_cost: number;
    description: string;
  }>({ name: "", icon: "🎁", coin_cost: 100, description: "" });

  const blankReward = () => ({
    name: "",
    icon: "🎁",
    coin_cost: 100,
    description: "",
  });

  // ── Policing tasks (parent-defined, the inverse of rewards) ──
  const [policing, setPolicing] = useState<PolicingTaskRow[]>([]);
  const [showPolForm, setShowPolForm] = useState(false);
  const blankPolicing = () => ({
    name: "",
    icon: "🚨",
    coins: 20,
    description: "",
  });
  const [polForm, setPolForm] = useState<{
    id?: string;
    name: string;
    icon: string;
    coins: number;
    description: string;
  }>(blankPolicing());
  function polRowGesture(onEdit: () => void) {
    return { onDoubleClick: onEdit };
  }

  async function loadPolicing() {
    if (!supabase) return;
    const { data } = await supabase
      .from("policing_tasks")
      .select("*")
      .eq("is_active", true)
      .order("coins", { ascending: false });
    setPolicing((data as PolicingTaskRow[]) || []);
  }

  async function savePolicing() {
    if (!supabase || !polForm.name.trim()) return;
    const payload = {
      name: polForm.name.trim(),
      icon: polForm.icon,
      coins: polForm.coins,
      description: polForm.description.trim() || null,
    };
    if (polForm.id) {
      await supabase.from("policing_tasks").update(payload).eq("id", polForm.id);
    } else {
      await supabase.from("policing_tasks").insert(payload);
    }
    setShowPolForm(false);
    setPolForm(blankPolicing());
    void loadPolicing();
  }

  function startEditPolicing(p: PolicingTaskRow) {
    setPolForm({
      id: p.id,
      name: p.name,
      icon: p.icon,
      coins: p.coins,
      description: p.description ?? "",
    });
    setShowPolForm(true);
  }

  async function deletePolicing(p: PolicingTaskRow) {
    if (!supabase) return;
    if (!confirm(`Delete policing task "${p.name}"?`)) return;
    await supabase
      .from("policing_tasks")
      .update({ is_active: false })
      .eq("id", p.id);
    void loadPolicing();
  }

  async function duplicatePolicing(p: PolicingTaskRow) {
    if (!supabase) return;
    await supabase.from("policing_tasks").insert({
      name: `${p.name} copy`,
      icon: p.icon,
      coins: p.coins,
      description: p.description ?? null,
    });
    void loadPolicing();
  }

  useEffect(() => {
    void loadRewards();
    void loadPolicing();
  }, []);

  useEffect(() => {
    if (!showPolForm) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPolForm(false);
        setPolForm(blankPolicing());
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPolForm]);

  useEffect(() => {
    if (!showForm) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowForm(false);
        setForm(blankReward());
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  async function loadRewards() {
    if (!supabase) return;
    const { data } = await supabase
      .from("rewards")
      .select("*")
      .eq("is_active", true);
    setRewards((data as RewardRow[]) || []);
  }

  async function saveReward() {
    if (!supabase || !form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      coin_cost: form.coin_cost,
      description: form.description.trim() || null,
    };
    if (form.id) {
      await supabase.from("rewards").update(payload).eq("id", form.id);
    } else {
      await supabase.from("rewards").insert(payload);
    }
    setShowForm(false);
    setForm(blankReward());
    void loadRewards();
  }

  function startEditReward(r: RewardRow) {
    setForm({
      id: r.id,
      name: r.name,
      icon: r.icon,
      coin_cost: r.coin_cost,
      description: r.description ?? "",
    });
    setShowForm(true);
  }

  async function duplicateReward(r: RewardRow) {
    if (!supabase) return;
    await supabase.from("rewards").insert({
      name: `${r.name} copy`,
      icon: r.icon,
      coin_cost: r.coin_cost,
      description: r.description ?? null,
    });
    void loadRewards();
  }

  function exportRewards() {
    const rows = rewards.map((r) => ({
      name: r.name,
      icon: r.icon,
      coin_cost: r.coin_cost,
      description: r.description || "",
      category: rewardCategory(r.name, r.icon),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [26, 6, 10, 44, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rewards");
    XLSX.writeFile(wb, "beehave-rewards.xlsx");
  }

  async function importRewards(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setImporting(true);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      let imported = 0;
      for (const row of rows) {
        if (!row.name) continue;
        await supabase.from("rewards").insert({
          name: String(row.name),
          icon: String(row.icon || "🎁"),
          coin_cost: parseInt(String(row.coin_cost)) || 100,
          description: row.description ? String(row.description) : null,
        });
        imported++;
      }
      alert(`✅ Imported ${imported} reward${imported !== 1 ? "s" : ""}.`);
      void loadRewards();
    } catch (err) {
      alert("Import failed: " + (err as Error).message);
    }
    setImporting(false);
    e.target.value = "";
  }

  async function deleteReward(r: RewardRow) {
    if (!supabase) return;
    if (!confirm(`Delete reward "${r.name}"?`)) return;
    await supabase.from("rewards").update({ is_active: false }).eq("id", r.id);
    void loadRewards();
  }

  const rewardForm = (
    <div className={`${cardCls} mb-2`}>
      <div className="mb-2.5 flex gap-2">
        <EmojiPicker
          value={form.icon}
          onChange={(emoji) => setForm((f) => ({ ...f, icon: emoji }))}
          emojis={REWARD_EMOJIS}
        />
        <input
          value={form.name}
          placeholder="Reward name"
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="flex-1 rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
        />
      </div>
      <input
        value={form.description}
        placeholder="Description (optional)"
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
        className="mb-2.5 w-full rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
      />
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[16px] text-[#f5c518]">🪙 Cost:</span>
        <input
          type="number"
          value={form.coin_cost}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              coin_cost: parseInt(e.target.value) || 0,
            }))
          }
          className="w-[100px] rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowForm(false);
            setForm(blankReward());
          }}
          className="rounded-[10px] border border-border bg-surface px-4 py-3 text-[14px] font-semibold text-muted"
        >
          Cancel
        </button>
        {form.id && (
          <button
            onClick={() => {
              void deleteReward({
                id: form.id,
                name: form.name,
              } as RewardRow);
              setShowForm(false);
              setForm(blankReward());
            }}
            className="rounded-[10px] border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-[14px] font-semibold text-[#ef4444]"
          >
            Delete
          </button>
        )}
        <button
          onClick={saveReward}
          className="flex-1 rounded-[10px] bg-[#f5c518] px-6 py-3 font-semibold text-[#0f0f1a]"
        >
          {form.id ? "Update Reward" : "Save Reward"}
        </button>
      </div>
    </div>
  );

  const policingForm = (
    <div className={`${cardCls} mb-2`}>
      <div className="mb-2.5 flex gap-2">
        <EmojiPicker
          value={polForm.icon}
          onChange={(emoji) => setPolForm((f) => ({ ...f, icon: emoji }))}
          emojis={TASK_EMOJIS}
        />
        <input
          value={polForm.name}
          placeholder="Policing task (e.g. Turn off the light)"
          onChange={(e) =>
            setPolForm((f) => ({ ...f, name: e.target.value }))
          }
          className="flex-1 rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
        />
      </div>
      <input
        value={polForm.description}
        placeholder="What was missed (optional)"
        onChange={(e) =>
          setPolForm((f) => ({ ...f, description: e.target.value }))
        }
        className="mb-2.5 w-full rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
      />
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[16px] text-[#ef4444]">🚨 Coins:</span>
        <input
          type="number"
          value={polForm.coins}
          onChange={(e) =>
            setPolForm((f) => ({ ...f, coins: parseInt(e.target.value) || 0 }))
          }
          className="w-[100px] rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[14px] text-foreground"
        />
        <span className="text-[12px] text-muted">
          taken from whoever missed it, given to whoever does it
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowPolForm(false);
            setPolForm(blankPolicing());
          }}
          className="rounded-[10px] border border-border bg-surface px-4 py-3 text-[14px] font-semibold text-muted"
        >
          Cancel
        </button>
        {polForm.id && (
          <button
            onClick={() => {
              void deletePolicing({
                id: polForm.id,
                name: polForm.name,
              } as PolicingTaskRow);
              setShowPolForm(false);
              setPolForm(blankPolicing());
            }}
            className="rounded-[10px] border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-[14px] font-semibold text-[#ef4444]"
          >
            Delete
          </button>
        )}
        <button
          onClick={savePolicing}
          className="flex-1 rounded-[10px] bg-[#f97316] px-6 py-3 font-semibold text-[#0f0f1a]"
        >
          {polForm.id ? "Update Policing Task" : "Save Policing Task"}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-bold">Rewards</h2>
        <button
          onClick={exportRewards}
          disabled={rewards.length === 0}
          className="rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/[0.12] px-3 py-2 text-[13px] text-[#22c55e] disabled:opacity-50"
        >
          📊 ↓
        </button>
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-[#4f8ef7]/25 bg-[#4f8ef7]/[0.12] px-3 py-2 text-[13px] text-[#4f8ef7] disabled:opacity-50"
        >
          {importing ? "…" : "📊 ↑"}
        </button>
        <button
          onClick={() => {
            setPolForm(blankPolicing());
            setShowPolForm((v) => !v);
            setShowForm(false);
            setShowAward(false);
          }}
          className="rounded-[10px] border border-[#f97316]/40 bg-[#f97316]/15 px-3 py-2 text-[13px] font-semibold text-[#f97316]"
        >
          + Policing
        </button>
        <button
          onClick={() => {
            setForm(blankReward());
            setShowForm((v) => !v);
            setShowPolForm(false);
            setShowAward(false);
          }}
          className="rounded-[10px] bg-[#f5c518] px-3 py-2 text-[13px] font-semibold text-[#0f0f1a]"
        >
          + Reward
        </button>
        <button
          onClick={() => {
            setShowAward((v) => !v);
            setShowForm(false);
            setShowPolForm(false);
          }}
          className="rounded-[10px] border border-[#f5c518]/50 bg-[#f5c518]/15 px-3 py-2 text-[13px] font-semibold text-[#f5c518]"
        >
          + Award
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={importRewards}
        />
      </div>

      {showAward && (
        <div className="mb-2">
          <AwardCard kids={kids} />
        </div>
      )}
      {showPolForm && !polForm.id && policingForm}
      {showForm && !form.id && rewardForm}

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="px-1 text-[11px] text-muted">
          Tap Edit, or double-click an item
        </span>
        <RewardSortSelect value={sortBy} onChange={setSortBy} />
      </div>

      {REWARD_CATEGORIES.map((cat) => {
        const items = sortRewards(
          rewards.filter((r) => rewardCategory(r.name, r.icon) === cat),
          sortBy,
        );
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-4">
            <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">
              {cat}
            </div>
            {items.map((r) =>
              showForm && form.id === r.id ? (
                <div key={r.id}>{rewardForm}</div>
              ) : (
                <div
                  key={r.id}
                  {...rowGesture(() => startEditReward(r))}
                  className={`${cardCls} mb-2 flex cursor-pointer select-none items-center gap-3`}
                >
                  <span
                    className="text-[28px]"
                    style={{ fontFamily: EMOJI_FONT }}
                  >
                    {r.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold">{r.name}</div>
                    {r.description && (
                      <div className="text-[13px] text-muted">
                        {r.description}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-[#f5c518]">
                    🪙 {r.coin_cost}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditReward(r);
                    }}
                    className="rounded-lg border border-[#f5c518]/40 bg-[#f5c518]/12 px-3 py-1.5 text-[13px] font-semibold text-[#f5c518]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void duplicateReward(r);
                    }}
                    className="rounded-lg bg-surface px-3 py-1.5 text-[13px] text-muted"
                  >
                    Duplicate
                  </button>
                </div>
              ),
            )}
          </div>
        );
      })}

      <div className="mt-6 mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        Policing tasks
      </div>
      {policing.length === 0 ? (
        <p className="px-1 text-[13px] text-muted">
          None yet — use “+ New Policing” above.
        </p>
      ) : (
        policing.map((p) =>
          showPolForm && polForm.id === p.id ? (
            <div key={p.id}>{policingForm}</div>
          ) : (
            <div
              key={p.id}
              {...polRowGesture(() => startEditPolicing(p))}
              className={`${cardCls} mb-2 flex cursor-pointer select-none items-center gap-3`}
            >
              <span className="text-[28px]" style={{ fontFamily: EMOJI_FONT }}>
                {p.icon}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                {p.description && (
                  <div className="text-[13px] text-muted">{p.description}</div>
                )}
              </div>
              <div className="font-bold text-[#ef4444]">−🪙 {p.coins}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditPolicing(p);
                }}
                className="rounded-lg border border-[#f5c518]/40 bg-[#f5c518]/12 px-3 py-1.5 text-[13px] font-semibold text-[#f5c518]"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void duplicatePolicing(p);
                }}
                className="rounded-lg bg-surface px-3 py-1.5 text-[13px] text-muted"
              >
                Duplicate
              </button>
            </div>
          ),
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ MESSAGE TAB ══════════════════ */
function MessageTab({
  kids,
  profile,
}: {
  kids: KidRow[];
  profile: BeehaveProfile;
}) {
  const [to, setTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!text.trim() || !supabase) return;
    await supabase.from("messages").insert({
      from_id: profile.id,
      to_id: to || null,
      content: text.trim(),
    });
    setText("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  const pillCls = "rounded-[20px] px-4 py-2 text-[14px] font-semibold";

  return (
    <div>
      <h2 className="mb-4 font-bold">Send a Message</h2>
      <div className={cardCls}>
        <Row label="To">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTo(null)}
              className={pillCls}
              style={{
                background:
                  to === null
                    ? "rgba(245,197,24,0.2)"
                    : "var(--border)",
                border: `1px solid ${
                  to === null
                    ? "rgba(245,197,24,0.5)"
                    : "var(--border)"
                }`,
                color: to === null ? "#f5c518" : "#94a3b8",
              }}
            >
              All kids
            </button>
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => setTo(k.id)}
                className={pillCls}
                style={{
                  background:
                    to === k.id
                      ? "rgba(245,197,24,0.2)"
                      : "var(--border)",
                  border: `1px solid ${
                    to === k.id
                      ? "rgba(245,197,24,0.5)"
                      : "var(--border)"
                  }`,
                  color: to === k.id ? "#f5c518" : "#94a3b8",
                }}
              >
                {k.avatar_emoji} {k.name}
              </button>
            ))}
          </div>
        </Row>
        <div className="mt-3.5">
          <textarea
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-[10px] border border-border bg-surface p-3.5 text-[15px] text-foreground"
          />
        </div>
        <button
          onClick={send}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-[10px] bg-[#f5c518] px-6 py-3 font-semibold text-[#0f0f1a] disabled:opacity-50"
        >
          {sent ? "✅ Sent!" : "📨 Send Message"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ PASSBOOK TAB ═════════════════ */
function ParentPassbookColumn({
  kid,
  profile,
}: {
  kid: KidRow;
  profile: BeehaveProfile;
}) {
  const [txns, setTxns] = useState<CoinTxn[]>([]);
  const [reds, setReds] = useState<RedemptionRowLite[]>([]);
  const [balance, setBalance] = useState(kid.coin_balance || 0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const [{ data: bal }, { data: t }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("coin_balance").eq("id", kid.id).single(),
      supabase
        .from("coin_transactions")
        .select("id, amount, reason, transaction_type, created_at")
        .eq("kid_id", kid.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("reward_redemptions")
        .select("*, reward:reward_id(name, icon, coin_cost)")
        .eq("kid_id", kid.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false }),
    ]);
    setBalance((bal as { coin_balance?: number } | null)?.coin_balance ?? 0);
    setTxns((t as CoinTxn[]) || []);
    setReds((r as RedemptionRowLite[]) || []);
    setLoaded(true);
  };

  useEffect(() => {
    if (!supabase) return;
    void load();
    const ch = supabase
      .channel(`beehave-pb-${kid.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coin_transactions", filter: `kid_id=eq.${kid.id}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reward_redemptions", filter: `kid_id=eq.${kid.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid.id]);

  async function accept(e: PbEntry, note: string) {
    if (!supabase) return;
    setBusy(e.id);
    try {
      await supabase
        .from("reward_redemptions")
        .update({
          status: "approved",
          parent_note: note.trim() || null,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", e.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function decline(e: PbEntry) {
    if (!supabase) return;
    setBusy(e.id);
    try {
      await supabase.from("reward_redemptions").delete().eq("id", e.id);
      const { data: k } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", kid.id)
        .single();
      const before = (k as { coin_balance?: number } | null)?.coin_balance ?? 0;
      await supabase
        .from("profiles")
        .update({ coin_balance: before + Math.abs(e.amount) })
        .eq("id", kid.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function undo(e: PbEntry) {
    if (!supabase) return;
    setBusy(e.id);
    try {
      await undoPassbookEntry(supabase, e.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const groups = buildPassbook(txns, reds, balance);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{kid.avatar_emoji}</span>
          <span className="font-bold">{kid.name}</span>
        </div>
        <span className="text-[15px] font-black text-[#f5c518]">
          🪙 {balance}
        </span>
      </div>
      <div className="max-h-[64vh] overflow-y-auto p-3">
        {!loaded ? (
          <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">
            No activity yet.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="mb-3">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {g.day}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    g.net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {g.net >= 0 ? "+" : ""}
                  {g.net} 🪙
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                {g.items.map((e, i) => {
                  const actionable =
                    e.kind === "redemption" && e.status === "pending";
                  return (
                    <PassbookRow
                      key={e.id}
                      e={e}
                      border={i > 0}
                      busy={busy === e.id}
                      onAccept={
                        actionable ? (note) => void accept(e, note) : undefined
                      }
                      onDecline={actionable ? () => void decline(e) : undefined}
                      onUndo={
                        e.kind === "txn" ? () => void undo(e) : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Coerce an Excel "when" cell (Date, serial number, or string) → ISO string.
function excelWhen(val: unknown): string {
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString();
  if (typeof val === "number" && isFinite(val)) {
    return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString();
  }
  const s = String(val ?? "").trim();
  const d = s ? new Date(s) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

const TXN_TYPES = [
  "task_reward",
  "penalty",
  "redemption",
  "bonus",
  "adjustment",
  "refund",
];

function ParentPassbooks({
  kids,
  profile,
}: {
  kids: KidRow[];
  profile: BeehaveProfile;
}) {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const importRef = useRef<HTMLInputElement | null>(null);

  async function exportPassbook() {
    if (!supabase) return;
    setBusy("export");
    try {
      const wb = XLSX.utils.book_new();
      for (const k of kids) {
        const [{ data: txns }, { data: reds }] = await Promise.all([
          supabase
            .from("coin_transactions")
            .select("id, amount, reason, transaction_type, created_at")
            .eq("kid_id", k.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("reward_redemptions")
            .select("id, coins_spent, status, created_at, reward:reward_id(name)")
            .eq("kid_id", k.id)
            .in("status", ["pending", "approved"])
            .order("created_at", { ascending: true }),
        ]);
        const rows: Record<string, unknown>[] = [
          ...(((txns as Record<string, unknown>[]) || []).map((t) => ({
            id: t.id,
            source: "txn",
            when: t.created_at,
            type: t.transaction_type,
            amount: t.amount,
            reason: t.reason || "",
          }))),
          ...(((reds as Record<string, unknown>[]) || []).map((r) => ({
            id: r.id,
            source: "redemption",
            when: r.created_at,
            type: r.status,
            amount: -(Number(r.coins_spent) || 0),
            reason: `Redeemed: ${
              (r.reward as { name?: string } | null)?.name ?? "reward"
            }`,
          }))),
        ].sort((a, b) => String(a.when).localeCompare(String(b.when)));
        const ws = XLSX.utils.json_to_sheet(
          rows.length
            ? rows
            : [
                {
                  id: "",
                  source: "txn",
                  when: "",
                  type: "adjustment",
                  amount: 0,
                  reason: "Opening balance",
                },
              ],
        );
        ws["!cols"] = [38, 12, 24, 14, 10, 40].map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, k.name.slice(0, 31));
      }
      XLSX.writeFile(wb, "beehave-passbook.xlsx");
    } finally {
      setBusy(null);
    }
  }

  async function importPassbook(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setBusy("import");
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { cellDates: true });
      const report: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const kid = kids.find(
          (k) => k.name.toLowerCase() === sheetName.trim().toLowerCase(),
        );
        if (!kid) continue;
        const rows = XLSX.utils.sheet_to_json(
          wb.Sheets[sheetName],
        ) as Record<string, unknown>[];
        const clean = rows.filter(
          (r) =>
            r.amount !== undefined &&
            r.amount !== "" &&
            Number.isFinite(Number(r.amount)),
        );
        const txnRows = clean.filter(
          (r) => String(r.source ?? "txn").toLowerCase() !== "redemption",
        );
        const redRows = clean.filter(
          (r) => String(r.source ?? "").toLowerCase() === "redemption",
        );

        // Rebuild the coin ledger from the sheet.
        await supabase.from("coin_transactions").delete().eq("kid_id", kid.id);
        const inserts = txnRows.map((r) => {
          const t = String(r.type ?? "adjustment").toLowerCase();
          return {
            kid_id: kid.id,
            amount: Math.round(Number(r.amount)),
            reason: String(r.reason ?? "Adjustment") || "Adjustment",
            transaction_type: TXN_TYPES.includes(t) ? t : "adjustment",
            created_at: excelWhen(r.when),
          };
        });
        if (inserts.length) {
          await supabase.from("coin_transactions").insert(inserts);
        }

        // Drop any redemption the user removed from the sheet.
        const keepIds = new Set(
          redRows.map((r) => String(r.id ?? "")).filter(Boolean),
        );
        const { data: existingReds } = await supabase
          .from("reward_redemptions")
          .select("id")
          .eq("kid_id", kid.id)
          .in("status", ["pending", "approved"]);
        const toDrop = ((existingReds as { id: string }[]) || [])
          .map((r) => r.id)
          .filter((id) => !keepIds.has(id));
        if (toDrop.length) {
          await supabase.from("reward_redemptions").delete().in("id", toDrop);
        }

        // Recompute the balance: everything earned minus redemptions still held.
        const [{ data: sumT }, { data: sumR }] = await Promise.all([
          supabase
            .from("coin_transactions")
            .select("amount")
            .eq("kid_id", kid.id),
          supabase
            .from("reward_redemptions")
            .select("coins_spent")
            .eq("kid_id", kid.id)
            .in("status", ["pending", "approved"]),
        ]);
        const earned = ((sumT as { amount: number }[]) || []).reduce(
          (s, x) => s + (x.amount || 0),
          0,
        );
        const held = ((sumR as { coins_spent: number }[]) || []).reduce(
          (s, x) => s + (x.coins_spent || 0),
          0,
        );
        const balance = Math.max(0, earned - held);
        await supabase
          .from("profiles")
          .update({ coin_balance: balance })
          .eq("id", kid.id);
        report.push(`${kid.name}: ${inserts.length} rows → balance ${balance}`);
      }
      alert(
        report.length
          ? `✅ Passbook updated\n\n${report.join("\n")}`
          : "No matching sheets — name each sheet after a kid.",
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert("Import failed: " + (err as Error).message);
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  if (kids.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No kids yet.</p>;
  }
  return (
    <>
      <div className="mb-3 mt-3 flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 py-2.5">
        <span className="flex-1 text-[13px] text-muted">
          📊 Passbook — export, fix in Excel, re-upload
        </span>
        <button
          onClick={exportPassbook}
          disabled={busy !== null}
          className="rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/[0.12] px-3 py-1.5 text-[13px] text-[#22c55e] disabled:opacity-50"
        >
          {busy === "export" ? "…" : "↓ Export"}
        </button>
        <button
          onClick={() => importRef.current?.click()}
          disabled={busy !== null}
          className="rounded-lg border border-[#4f8ef7]/25 bg-[#4f8ef7]/[0.12] px-3 py-1.5 text-[13px] text-[#4f8ef7] disabled:opacity-50"
        >
          {busy === "import" ? "Importing…" : "↑ Import"}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={importPassbook}
        />
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {kids.map((k) => (
          <ParentPassbookColumn
            key={`${k.id}-${reloadKey}`}
            kid={k}
            profile={profile}
          />
        ))}
      </div>
    </>
  );
}
