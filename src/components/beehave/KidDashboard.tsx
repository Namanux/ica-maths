"use client";

import {
  useState,
  useEffect,
  useRef,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { useBeehaveAuth, type BeehaveProfile } from "@/lib/beehaveAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { beehave } from "@/lib/beehave";

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskRow = {
  id: string;
  name: string;
  icon: string;
  start_time: string;
  deadline_time?: string | null;
  expiry_time?: string | null;
  full_coins: number;
  min_coins?: number | null;
  penalty_coins: number;
  task_type?: string | null;
  target_duration?: number | null;
  requires_approval?: boolean | null;
  requires_photo?: boolean | null;
  [k: string]: unknown;
};

type CompletionRow = {
  id: string;
  task_id: string;
  kid_id: string;
  coins_earned: number;
  status: string;
  scheduled_date: string;
  photo_path?: string | null;
  completed_at?: string | null;
  completion_count?: number | null;
};

type MessageRow = {
  id: string;
  content: string;
  to_id?: string | null;
  is_read?: boolean;
  created_at?: string;
  from?: { name?: string; avatar_emoji?: string; avatar_color?: string } | null;
};

type SessionTimerState = {
  hasStarted?: boolean;
  running?: boolean;
  remaining: number;
  totalElapsed: number;
};

type CoinPop = { id: number; taskId: string; amount: number; pending: boolean };

type Celebration =
  | { type: "levelup"; label: string; emoji: string; coins?: number }
  | { type: "milestone"; coins: number };

type AddTaskForm = {
  icon: string;
  name: string;
  coins: number;
  time: string;
  note: string;
};

type InitiativeData = {
  beforeFile: File | null;
  beforePreview: string | null;
  note: string;
  afterFile: File | null;
  afterPreview: string | null;
};

// ─── Local date helper (Brisbane-safe, avoids UTC midnight bug) ───────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// ─── GoldCoin component (cross-platform, replaces 🪙 emoji) ──────────────────
function GoldCoin({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 38% 35%, #ffe566, #f5c518 55%, #b8860b)",
        border: `${Math.max(1, size * 0.08)}px solid #c9a010`,
        boxShadow: `0 ${size * 0.05}px ${size * 0.15}px rgba(245,197,24,0.4)`,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    />
  );
}

// ─── Web Audio API ────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  if (!_audioCtx) _audioCtx = new (window.AudioContext || w.webkitAudioContext!)();
  if (_audioCtx.state === "suspended") void _audioCtx.resume();
  return _audioCtx;
}

function playNote(
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainVal = 0.3,
) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainVal, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playSound(type: "coin" | "milestone" | "levelup" | "nudge") {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    if (type === "coin") {
      playNote(880, "sine", t, 0.15, 0.3);
      playNote(1100, "sine", t + 0.05, 0.12, 0.2);
      playNote(1320, "sine", t + 0.1, 0.2, 0.25);
    } else if (type === "milestone") {
      [523, 659, 784, 1047].forEach((f, i) =>
        playNote(f, "triangle", t + i * 0.12, 0.25, 0.35),
      );
      playNote(1047, "sine", t + 0.55, 0.5, 0.3);
    } else if (type === "levelup") {
      [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
        playNote(f, "triangle", t + i * 0.08, 0.18, 0.4);
      });
      playNote(1047, "sine", t + 0.7, 0.8, 0.4);
      playNote(1319, "sine", t + 0.9, 0.6, 0.35);
    } else if (type === "nudge") {
      playNote(660, "sine", t, 0.2, 0.15);
      playNote(440, "sine", t + 0.25, 0.25, 0.12);
    }
  } catch {
    /* audio not available */
  }
}

// ─── Web Speech API ───────────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1.1;
  utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith("en") && v.localService);
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ─── Confetti Canvas ──────────────────────────────────────────────────────────
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#f5c518",
      "#22c55e",
      "#4f8ef7",
      "#a855f7",
      "#f97316",
      "#ef4444",
      "#fff",
    ];
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotSpeed: number;
      life: number;
      decay: number;
    };
    const particles: Particle[] = [];

    for (let burst = 0; burst < 2; burst++) {
      const ox = burst === 0 ? canvas.width * 0.2 : canvas.width * 0.8;
      for (let i = 0; i < 60; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
        const speed = 6 + Math.random() * 8;
        particles.push({
          x: ox,
          y: canvas.height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 5 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.012 + Math.random() * 0.008,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.25;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;
        if (p.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive) rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

// ─── Celebration Overlay ──────────────────────────────────────────────────────
const MILESTONES = [
  { emoji: "🎉", msg: "Amazing!", color: "#f5c518" },
  { emoji: "🔥", msg: "On Fire!", color: "#f97316" },
  { emoji: "⚡", msg: "Supercharged!", color: "#4f8ef7" },
  { emoji: "🚀", msg: "Blast Off!", color: "#a855f7" },
  { emoji: "💎", msg: "Legendary!", color: "#22c55e" },
  { emoji: "🏆", msg: "Champion!", color: "#f5c518" },
  { emoji: "👑", msg: "Royalty!", color: "#ef4444" },
  { emoji: "⭐", msg: "Superstar!", color: "#4f8ef7" },
];

function CelebrationOverlay({
  celebration,
  onDone,
}: {
  celebration: Celebration | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [celebration, onDone]);

  if (!celebration) return null;

  const isLevelUp = celebration.type === "levelup";
  const coins = celebration.type === "milestone" ? celebration.coins : celebration.coins ?? 0;
  const milestone = isLevelUp
    ? null
    : MILESTONES[(Math.floor((coins || 0) / 100) - 1) % MILESTONES.length];
  const accent = isLevelUp ? "#f5c518" : milestone?.color || "#f5c518";

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        animation: "beehaveCelebFade 5s ease-out forwards",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px 48px",
          background: "var(--surface)",
          border: `2px solid ${accent}`,
          borderRadius: 24,
          boxShadow: `0 0 60px ${accent}44`,
          animation: "beehaveCelebBounce 0.5s ease",
          maxWidth: 320,
        }}
      >
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 12 }}>
          {isLevelUp ? celebration.emoji : milestone?.emoji}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: accent,
            marginBottom: 8,
          }}
        >
          {isLevelUp ? `Level Up!` : `${coins} Coins!`}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: 4,
          }}
        >
          {isLevelUp ? celebration.label : milestone?.msg}
        </div>
        {isLevelUp && (
          <div style={{ fontSize: 16, color: "var(--muted)", marginTop: 8 }}>
            You&apos;re now a{" "}
            <span style={{ color: accent, fontWeight: 700 }}>
              {celebration.label}
            </span>
            !
          </div>
        )}
        {!isLevelUp && (
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
            Keep going — you&apos;re crushing it!
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 20 }}>
          Tap to continue
        </div>
      </div>
    </div>
  );
}

// ─── Focus timer helpers ──────────────────────────────────────────────────────
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getSessionDuration(task: TaskRow): number {
  if ((task.target_duration ?? 0) > 0) return task.target_duration as number;
  if (!task.start_time || !task.deadline_time) return 0;
  const [sh, sm] = task.start_time.split(":").map(Number);
  const [dh, dm] = task.deadline_time.split(":").map(Number);
  const secs = (dh * 60 + dm - sh * 60 - sm) * 60;
  return secs > 0 ? secs : 0;
}

// ─── Kid-created task templates ──────────────────────────────────────────────
const KID_TASK_TEMPLATES = [
  { icon: "🧹", name: "Clean my room", coins: 15 },
  { icon: "🐕", name: "Walk the dog", coins: 10 },
  { icon: "🌿", name: "Water the plants", coins: 5 },
  { icon: "🍽️", name: "Set the table", coins: 5 },
  { icon: "🧺", name: "Fold my laundry", coins: 10 },
  { icon: "📚", name: "Read for 20 minutes", coins: 10 },
  { icon: "🎨", name: "Practice art or music", coins: 10 },
  { icon: "🧽", name: "Wash the dishes", coins: 10 },
];
const KID_ICON_CHOICES = [
  "⭐", "🧹", "🐕", "🌿", "🍽️", "🧺", "📚", "🎨",
  "🧽", "🛏️", "🚗", "🧸", "⚽", "🎵", "🧁", "💡",
];

// ─── Main KidDashboard ────────────────────────────────────────────────────────
export function KidDashboard(_props: { profileSlug: string }) {
  const { profile, loading, error, refreshCurrentProfile } = useBeehaveAuth();
  const supabase = getSupabaseClient();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const rewardTab = activeTab === "Reward";
  const passbookTab = activeTab === "Passbook";

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [coinPops, setCoinPops] = useState<CoinPop[]>([]);
  const [now, setNow] = useState(new Date());
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const todayStr = localDateStr(now);
  const [viewDate, setViewDate] = useState(todayStr);
  const viewDateRef = useRef(viewDate);
  useEffect(() => {
    viewDateRef.current = viewDate;
  }, [viewDate]);
  const isToday = viewDate === todayStr;

  const lastInteractionRef = useRef(Date.now());
  const prevStatusMapRef = useRef<Record<string, string>>({});

  const [sessionTimers, setSessionTimers] = useState<
    Record<string, SessionTimerState>
  >({});
  const [activeSessionTaskId, setActiveSessionTaskId] = useState<string | null>(
    null,
  );
  const activeRunStartedAtRef = useRef<string | null>(null);
  const orphanRecoveryDone = useRef(false);

  const [photoCapture, setPhotoCapture] = useState<{
    task: TaskRow;
    timeSpentSecs: number | null;
  } | null>(null);
  const [uploadingPhotoTaskId, setUploadingPhotoTaskId] = useState<string | null>(
    null,
  );
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [addTaskStep, setAddTaskStep] = useState<
    null | "templates" | "form"
  >(null);
  const [addTaskForm, setAddTaskForm] = useState<AddTaskForm | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskSentToast, setTaskSentToast] = useState(false);

  const [initiativeStep, setInitiativeStep] = useState<
    null | "before" | "note" | "after"
  >(null);
  const [initiativeData, setInitiativeData] = useState<InitiativeData | null>(
    null,
  );
  const [initiativeCaptureTarget, setInitiativeCaptureTarget] = useState<
    "before" | "after" | null
  >(null);
  const [submittingInitiative, setSubmittingInitiative] = useState(false);
  const [initiativeSentToast, setInitiativeSentToast] = useState(false);
  const initiativePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Unlock Web Audio on first touch (required on iOS)
  useEffect(() => {
    const unlock = () => {
      getAudioCtx();
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("touchstart", unlock, { passive: true });
    return () => document.removeEventListener("touchstart", unlock);
  }, []);

  // Clock — also rolls viewDate forward at midnight
  useEffect(() => {
    const t = setInterval(() => {
      const newNow = new Date();
      setNow(newNow);
      if (
        viewDateRef.current ===
        localDateStr(new Date(newNow.getTime() - 1000))
      ) {
        setViewDate(localDateStr(newNow));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function touchInteraction() {
    lastInteractionRef.current = Date.now();
  }
  useEffect(() => {
    window.addEventListener("touchstart", touchInteraction, { passive: true });
    window.addEventListener("click", touchInteraction, { passive: true });
    return () => {
      window.removeEventListener("touchstart", touchInteraction);
      window.removeEventListener("click", touchInteraction);
    };
  }, []);

  // Voice reminder check — every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!profile || !isToday) return;
      const completedIds = new Set(completions.map((c) => c.task_id));
      const pendingActiveTasks = tasks.filter(
        (t) =>
          !completedIds.has(t.id) &&
          ["active", "grace"].includes(beehave.getTaskStatus(t)),
      );
      const inactiveSecs = (Date.now() - lastInteractionRef.current) / 1000;
      if (pendingActiveTasks.length > 0 && inactiveSecs > 12 * 60) {
        const t = pendingActiveTasks[0];
        speak(`${profile.name}, don't forget your task: ${t.name}!`);
        lastInteractionRef.current = Date.now();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [profile, tasks, completions, isToday]);

  // Detect task status transitions → speak on upcoming→active or active→grace
  useEffect(() => {
    if (!profile || !isToday) return;
    const completedIds = new Set(completions.map((c) => c.task_id));
    for (const task of tasks) {
      if (completedIds.has(task.id)) continue;
      const status = beehave.getTaskStatus(task, false, viewDateRef.current);
      const prev = prevStatusMapRef.current[task.id];
      if (prev && prev !== status) {
        if (prev === "upcoming" && status === "active") {
          speak(`${profile.name}, time for ${task.name}!`);
        } else if (prev === "active" && status === "grace") {
          speak(
            `${profile.name}, ${task.name} is running late — please do it now!`,
          );
        }
      }
      prevStatusMapRef.current[task.id] = status;
    }
  }, [now, tasks, completions, profile, isToday]);

  // Load data whenever profile or viewDate changes
  useEffect(() => {
    if (!profile || !supabase) return;
    void loadTasks();
    void loadMessages();
    const ch = supabase
      .channel("beehave-kid-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions" },
        () => void loadTasks(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `to_id=eq.${profile.id}`,
        },
        () => void loadMessages(),
      )
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, viewDate]);

  async function loadTasks() {
    if (!profile || !supabase) return;
    const vd = viewDateRef.current;
    const [y, m, d] = vd.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", profile.id)
      .eq("is_active", true)
      .contains("days_of_week", [dayOfWeek])
      .order("start_time");

    const { data: compData } = await supabase
      .from("task_completions")
      .select("*")
      .eq("kid_id", profile.id)
      .eq("scheduled_date", vd);

    setTasks((taskData as TaskRow[]) || []);
    setCompletions((compData as CompletionRow[]) || []);
    void refreshCurrentProfile();
  }

  async function loadMessages() {
    if (!profile || !supabase) return;
    const { data } = await supabase
      .from("messages")
      .select("*, from:from_id(name, avatar_emoji, avatar_color)")
      .or(`to_id.eq.${profile.id},to_id.is.null`)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);
    setMessages((data as MessageRow[]) || []);
  }

  async function markMessageRead(id: string) {
    if (!supabase) return;
    await supabase.from("messages").update({ is_read: true }).eq("id", id);
    setMessages((m) => m.filter((x) => x.id !== id));
  }

  async function completeTask(
    task: TaskRow,
    timeSpentSecs: number | null = null,
    photoPath: string | null = null,
  ) {
    if (!profile || !supabase) return;
    const existing = completions.find((c) => c.task_id === task.id);
    if (existing) return;

    let coinsEarned = beehave.calculateCoins(task);
    if (timeSpentSecs !== null && (task.target_duration ?? 0) > 0) {
      const ratio = Math.max(
        0.5,
        timeSpentSecs / (task.target_duration as number),
      );
      coinsEarned = Math.round(coinsEarned * Math.min(1, ratio));
    }

    const needsApproval = task.requires_approval === true || !!photoPath;

    if (needsApproval) {
      await supabase.from("task_completions").insert({
        task_id: task.id,
        kid_id: profile.id,
        scheduled_date: viewDateRef.current,
        coins_earned: coinsEarned,
        status: "pending_approval",
        photo_path: photoPath,
      });
      playSound("coin");
      popCoins(task.id, coinsEarned, true);
    } else {
      const { data: freshKid } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", profile.id)
        .single();
      const balanceBefore =
        (freshKid as { coin_balance?: number } | null)?.coin_balance || 0;

      const { data: comp } = await supabase
        .from("task_completions")
        .insert({
          task_id: task.id,
          kid_id: profile.id,
          scheduled_date: viewDateRef.current,
          coins_earned: coinsEarned,
          status: "auto_approved",
        })
        .select()
        .single();

      await supabase.from("coin_transactions").insert({
        kid_id: profile.id,
        amount: coinsEarned,
        reason: `Completed: ${task.name}`,
        transaction_type: "task_reward",
        reference_id: (comp as { id?: string } | null)?.id,
      });
      await supabase
        .from("profiles")
        .update({ coin_balance: balanceBefore + coinsEarned })
        .eq("id", profile.id);

      const balanceAfter = balanceBefore + coinsEarned;
      playSound("coin");
      popCoins(task.id, coinsEarned, false);

      const levelBefore = beehave.coinsToLevel(balanceBefore);
      const levelAfter = beehave.coinsToLevel(balanceAfter);
      if (levelBefore.label !== levelAfter.label) {
        setTimeout(() => {
          playSound("levelup");
          setCelebration({
            type: "levelup",
            label: levelAfter.label,
            emoji: levelAfter.emoji,
          });
        }, 700);
      } else {
        const mBefore = Math.floor(balanceBefore / 100);
        const mAfter = Math.floor(balanceAfter / 100);
        if (mAfter > mBefore) {
          setTimeout(() => {
            playSound("milestone");
            setCelebration({ type: "milestone", coins: mAfter * 100 });
          }, 700);
        }
      }
    }

    await loadTasks();
    await refreshCurrentProfile();
  }

  function requestPhotoThenComplete(
    task: TaskRow,
    timeSpentSecs: number | null,
  ) {
    setPhotoCapture({ task, timeSpentSecs });
    setTimeout(() => photoInputRef.current?.click(), 0);
  }

  async function handlePhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const capture = photoCapture;
    setPhotoCapture(null);
    if (!file || !capture || !profile || !supabase) return;

    const { task, timeSpentSecs } = capture;
    setUploadingPhotoTaskId(task.id);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profile.id}/${task.id}/${viewDateRef.current}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("task-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (error) throw error;
      await completeTask(task, timeSpentSecs, path);
    } catch {
      alert("Photo upload failed — check your connection and try again.");
    } finally {
      setUploadingPhotoTaskId(null);
    }
  }

  function currentTimeHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(
      n.getMinutes(),
    ).padStart(2, "0")}`;
  }

  function openAddTask() {
    setAddTaskStep("templates");
  }

  function pickTemplate(t: (typeof KID_TASK_TEMPLATES)[number]) {
    setAddTaskForm({
      icon: t.icon,
      name: t.name,
      coins: t.coins,
      time: currentTimeHHMM(),
      note: "",
    });
    setAddTaskStep("form");
  }

  function pickCustomTask() {
    setAddTaskForm({
      icon: "⭐",
      name: "",
      coins: 10,
      time: currentTimeHHMM(),
      note: "",
    });
    setAddTaskStep("form");
  }

  function closeAddTask() {
    setAddTaskStep(null);
    setAddTaskForm(null);
  }

  async function submitKidTask() {
    if (!addTaskForm?.name?.trim() || !profile || !supabase) return;
    setSubmittingTask(true);
    const [h, m] = addTaskForm.time.split(":").map(Number);
    const expiryTotal = h * 60 + m + 120;
    const expiryTime = `${String(Math.floor(expiryTotal / 60) % 24).padStart(
      2,
      "0",
    )}:${String(expiryTotal % 60).padStart(2, "0")}`;
    const [y, mo, d] = viewDateRef.current.split("-").map(Number);
    const dayOfWeek = new Date(y, mo - 1, d, 12, 0, 0).getDay();

    const { error } = await supabase.from("tasks").insert({
      name: addTaskForm.name.trim(),
      icon: addTaskForm.icon,
      assigned_to: profile.id,
      days_of_week: [dayOfWeek],
      start_time: addTaskForm.time,
      expiry_time: expiryTime,
      full_coins: addTaskForm.coins,
      min_coins: Math.max(1, Math.round(addTaskForm.coins / 3)),
      penalty_coins: Math.round(addTaskForm.coins / 2),
      task_type: "task",
      approval: "auto",
      requires_photo: false,
      created_by_kid: true,
      is_kid_created: true,
      pending_parent_review: true,
      is_active: false,
      note: addTaskForm.note.trim() || null,
      start_date: viewDateRef.current,
    });
    setSubmittingTask(false);
    if (error) {
      alert("Could not send your task — try again.");
      return;
    }

    closeAddTask();
    playSound("nudge");
    setTaskSentToast(true);
    setTimeout(() => setTaskSentToast(false), 3500);
  }

  function openInitiative() {
    setInitiativeData({
      beforeFile: null,
      beforePreview: null,
      note: "",
      afterFile: null,
      afterPreview: null,
    });
    setInitiativeStep("before");
  }

  function closeInitiative() {
    if (initiativeData?.beforePreview)
      URL.revokeObjectURL(initiativeData.beforePreview);
    if (initiativeData?.afterPreview)
      URL.revokeObjectURL(initiativeData.afterPreview);
    setInitiativeStep(null);
    setInitiativeData(null);
    setInitiativeCaptureTarget(null);
  }

  function captureInitiativePhoto(target: "before" | "after") {
    setInitiativeCaptureTarget(target);
    setTimeout(() => initiativePhotoInputRef.current?.click(), 0);
  }

  function handleInitiativePhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = initiativeCaptureTarget;
    setInitiativeCaptureTarget(null);
    if (!file || !target) return;

    const previewUrl = URL.createObjectURL(file);
    setInitiativeData((prev) => {
      if (!prev) return prev;
      if (target === "before") {
        if (prev.beforePreview) URL.revokeObjectURL(prev.beforePreview);
        return { ...prev, beforeFile: file, beforePreview: previewUrl };
      } else {
        if (prev.afterPreview) URL.revokeObjectURL(prev.afterPreview);
        return { ...prev, afterFile: file, afterPreview: previewUrl };
      }
    });
  }

  async function submitInitiative() {
    if (
      !initiativeData?.beforeFile ||
      !initiativeData?.afterFile ||
      !profile ||
      !supabase
    )
      return;
    setSubmittingInitiative(true);
    try {
      const stamp = Date.now();
      const beforePath = `initiatives/${profile.id}/${stamp}-before.jpg`;
      const afterPath = `initiatives/${profile.id}/${stamp}-after.jpg`;

      const { error: beforeErr } = await supabase.storage
        .from("task-photos")
        .upload(beforePath, initiativeData.beforeFile, {
          contentType: initiativeData.beforeFile.type || "image/jpeg",
        });
      if (beforeErr) throw beforeErr;

      const { error: afterErr } = await supabase.storage
        .from("task-photos")
        .upload(afterPath, initiativeData.afterFile, {
          contentType: initiativeData.afterFile.type || "image/jpeg",
        });
      if (afterErr) throw afterErr;

      const { error: insertErr } = await supabase.from("initiatives").insert({
        kid_id: profile.id,
        note: initiativeData.note.trim() || null,
        before_photo_path: beforePath,
        after_photo_path: afterPath,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      closeInitiative();
      playSound("nudge");
      setInitiativeSentToast(true);
      setTimeout(() => setInitiativeSentToast(false), 3500);
    } catch {
      alert(
        "Could not send your initiative — check your connection and try again.",
      );
    } finally {
      setSubmittingInitiative(false);
    }
  }

  // Ticks the one active session's timer
  useEffect(() => {
    if (!activeSessionTaskId) return;
    const t = setInterval(() => {
      setSessionTimers((prev) => {
        const cur = prev[activeSessionTaskId];
        if (!cur) return prev;
        return {
          ...prev,
          [activeSessionTaskId]: {
            ...cur,
            remaining: Math.max(0, cur.remaining - 1),
            totalElapsed: cur.totalElapsed + 1,
          },
        };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activeSessionTaskId]);

  function startSessionTimer(task: TaskRow) {
    if (activeSessionTaskId && activeSessionTaskId !== task.id) return;
    activeRunStartedAtRef.current = new Date().toISOString();
    setActiveSessionTaskId(task.id);
    setSessionTimers((prev) => ({
      ...prev,
      [task.id]: {
        ...(prev[task.id] || {
          remaining: getSessionDuration(task),
          totalElapsed: 0,
        }),
        running: true,
        hasStarted: true,
      },
    }));
  }

  async function stopSessionTimer(task: TaskRow) {
    if (!profile || !supabase) return;
    const startedAt = activeRunStartedAtRef.current;
    const endedAt = new Date().toISOString();
    activeRunStartedAtRef.current = null;
    setActiveSessionTaskId(null);
    setSessionTimers((prev) => ({
      ...prev,
      [task.id]: { ...prev[task.id], running: false },
    }));
    if (startedAt) {
      const runSecs = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      );
      if (runSecs > 0) {
        await supabase.from("session_runs").insert({
          task_id: task.id,
          kid_id: profile.id,
          scheduled_date: viewDateRef.current,
          started_at: startedAt,
          ended_at: endedAt,
          duration_secs: runSecs,
        });
      }
    }
  }

  async function doneSessionTimer(task: TaskRow) {
    if (!profile || !supabase) return;
    const startedAt = activeRunStartedAtRef.current;
    const endedAt = new Date().toISOString();
    const wasRunning = activeSessionTaskId === task.id;
    activeRunStartedAtRef.current = null;
    setActiveSessionTaskId(null);
    let finalElapsed = sessionTimers[task.id]?.totalElapsed || 0;
    if (startedAt && wasRunning) {
      const runSecs = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      );
      if (runSecs > 0) {
        await supabase.from("session_runs").insert({
          task_id: task.id,
          kid_id: profile.id,
          scheduled_date: viewDateRef.current,
          started_at: startedAt,
          ended_at: endedAt,
          duration_secs: runSecs,
        });
        finalElapsed += runSecs;
      }
    }
    setSessionTimers((prev) => ({
      ...prev,
      [task.id]: { ...prev[task.id], running: false },
    }));
    if (task.requires_photo) {
      requestPhotoThenComplete(task, finalElapsed);
    } else {
      await completeTask(task, finalElapsed);
    }
  }

  async function recoverOrphanedSessions(taskList: TaskRow[]) {
    if (!profile || !supabase) return;
    const { data: orphans } = await supabase
      .from("session_runs")
      .select("*")
      .eq("kid_id", profile.id)
      .is("ended_at", null);
    if (!orphans || orphans.length === 0) return;

    for (const run of orphans as Array<{
      id: string;
      task_id: string;
      started_at: string;
      scheduled_date: string;
    }>) {
      const endedAt = new Date().toISOString();
      const durationSecs = Math.max(
        0,
        Math.round(
          (new Date(endedAt).getTime() - new Date(run.started_at).getTime()) /
            1000,
        ),
      );
      await supabase
        .from("session_runs")
        .update({ ended_at: endedAt, duration_secs: durationSecs })
        .eq("id", run.id);

      const task = taskList.find((t) => t.id === run.task_id);
      if (!task) continue;

      const { data: allRuns } = await supabase
        .from("session_runs")
        .select("duration_secs")
        .eq("task_id", task.id)
        .eq("kid_id", profile.id)
        .eq("scheduled_date", run.scheduled_date);
      const totalElapsed = ((allRuns as Array<{ duration_secs?: number }>) || [])
        .reduce((s, r) => s + (r.duration_secs || 0), 0);

      setSessionTimers((prev) => ({
        ...prev,
        [task.id]: {
          hasStarted: true,
          running: false,
          remaining: Math.max(0, getSessionDuration(task) - totalElapsed),
          totalElapsed,
        },
      }));
    }
  }

  useEffect(() => {
    if (
      !profile ||
      orphanRecoveryDone.current ||
      !isToday ||
      tasks.length === 0
    )
      return;
    orphanRecoveryDone.current = true;
    void recoverOrphanedSessions(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, tasks, isToday]);

  function popCoins(taskId: string, amount: number, pending = false) {
    const id = Date.now();
    setCoinPops((p) => [...p, { id, taskId, amount, pending }]);
    setTimeout(
      () => setCoinPops((p) => p.filter((x) => x.id !== id)),
      1400,
    );
  }

  function shiftDate(days: number) {
    const [y, m, d] = viewDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + days, 12, 0, 0);
    setViewDate(localDateStr(next));
  }

  function formatViewDate() {
    const [y, m, d] = viewDate.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const label = date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return isToday ? `${label} · Today` : label;
  }

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

  if (passbookTab) {
    return (
      <div className="flex flex-1 flex-col bg-background text-foreground">
        <KidPassbook />
      </div>
    );
  }

  if (rewardTab) {
    return (
      <div className="flex flex-1 flex-col bg-background text-foreground">
        <KidRewards />
      </div>
    );
  }

  const coinBalance = (profile.coin_balance as number) || 0;
  const level = beehave.coinsToLevel(coinBalance);
  const completedIds = new Set(completions.map((c) => c.task_id));
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => completedIds.has(t.id)).length;
  const pendingTasks = tasks.filter((t) => !completedIds.has(t.id));
  const todayCoinsEarned = completions.reduce(
    (s, c) => s + (c.coins_earned || 0),
    0,
  );
  const todayPossible = tasks.reduce((s, t) => s + (t.full_coins || 0), 0);
  const allDone = doneTasks === totalTasks && totalTasks > 0;
  const levelProgress = level.next
    ? Math.min(
        100,
        ((coinBalance - level.min) / (level.next.min - level.min)) * 100,
      )
    : 100;

  const avatarColor = (profile.avatar_color as string) || "#4f8ef7";
  const avatarEmoji = (profile.avatar_emoji as string) || "🧒";

  return (
    <div
      className="flex flex-1 flex-col bg-background text-foreground"
      onClick={touchInteraction}
    >
      <ConfettiCanvas active={!!celebration} />
      <CelebrationOverlay
        celebration={celebration}
        onDone={() => setCelebration(null)}
      />

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <input
        ref={initiativePhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInitiativePhotoSelected}
      />

      {/* ── Compact header ── */}
      <div className="shrink-0 border-b border-border bg-surface px-3.5 pt-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              shiftDate(-1);
            }}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-border bg-surface text-[15px] text-muted"
          >
            ‹
          </button>
          <span className="flex-1 text-center text-xs text-muted">
            {formatViewDate()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              shiftDate(1);
            }}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-border bg-surface text-[15px] text-muted"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2.5 pb-2">
          <div
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[20px]"
            style={{
              background: `${avatarColor}33`,
              border: `2px solid ${avatarColor}`,
            }}
          >
            {avatarEmoji}
          </div>

          <span className="shrink-0 text-[17px] font-extrabold">
            {profile.name}
          </span>

          {isToday && (
            <button
              onClick={openInitiative}
              title="Start a new initiative"
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-[#a855f7]/40 bg-[#a855f7]/15 text-[13px] text-[#a855f7]"
            >
              📸
            </button>
          )}

          <span className="text-[14px] text-muted">|</span>

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[15px]">{level.emoji}</span>
            <GoldCoin size={13} />
            <span className="text-[14px] font-bold text-[#f5c518]">
              {beehave.formatCoins(coinBalance)}
            </span>
          </div>

          <span className="text-[14px] text-muted">|</span>

          <div className="flex shrink-0 items-center gap-[3px]">
            <GoldCoin size={11} />
            <span className="text-[13px] font-semibold text-[#f5c518]">
              {todayCoinsEarned}
            </span>
            <span className="text-[12px] text-muted">/{todayPossible}</span>
          </div>

          <span className="text-[14px] text-muted">|</span>

          <div className="flex shrink-0 items-center gap-[3px]">
            <span className="text-[13px]">✅</span>
            <span className="text-[13px] font-semibold text-[#22c55e]">
              {doneTasks}
            </span>
            <span className="text-[12px] text-muted">/{totalTasks}</span>
          </div>
        </div>

        <div className="-mx-3.5 h-[3px] overflow-hidden bg-surface">
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${levelProgress}%`,
              background: `linear-gradient(90deg, ${level.color}, ${
                level.next?.color || level.color
              })`,
            }}
          />
        </div>
      </div>

      {/* Messages banner */}
      {messages.length > 0 && (
        <div className="shrink-0 px-3.5 pt-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="mb-1.5 flex items-center justify-between rounded-[10px] border border-[#a855f7]/30 bg-[#a855f7]/10 px-3.5 py-2.5"
            >
              <div>
                <span className="text-[12px] font-bold text-[#a855f7]">
                  {msg.from?.avatar_emoji} {msg.from?.name}:
                </span>
                <p className="mt-0.5 text-[13px]">{msg.content}</p>
              </div>
              <button
                onClick={() => markMessageRead(msg.id)}
                className="shrink-0 p-1 text-[16px]"
              >
                ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Past/future notice */}
      {!isToday && (
        <div className="mx-3.5 mt-1.5 shrink-0 rounded-lg border border-[#4f8ef7]/20 bg-[#4f8ef7]/10 px-3 py-[7px] text-center text-[12px] text-[#4f8ef7]">
          📅 {viewDate < todayStr ? "Past" : "Future"} tasks — read only ·{" "}
          <span
            onClick={() => setViewDate(todayStr)}
            className="cursor-pointer underline"
          >
            Back to today
          </span>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-2.5">
        {allDone && isToday ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div
              className="mb-4 text-[72px]"
              style={{ animation: "beehaveCelebBounce 1s ease infinite" }}
            >
              🏆
            </div>
            <div className="mb-2 text-[24px] font-black text-[#f5c518]">
              All done for today!
            </div>
            <div className="mb-4 text-[15px] text-muted">
              You earned{" "}
              <span className="font-bold text-[#f5c518]">
                {todayCoinsEarned}
              </span>{" "}
              coins today.
            </div>
            <div className="text-[13px] text-muted">
              Tasks sent to parent for approval.
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-5 py-[60px] text-center text-muted">
            <div className="mb-3 text-[48px]">🎉</div>
            <p className="text-[18px] font-semibold">
              No tasks{isToday ? " today" : " this day"}!
            </p>
            <p className="mt-2 text-[14px]">
              {isToday ? "Enjoy your free time." : "Nothing scheduled."}
            </p>
          </div>
        ) : (
          <>
            {doneTasks > 0 && pendingTasks.length > 0 && (
              <div className="mb-2.5 flex items-center gap-2 rounded-[10px] border border-[#22c55e]/20 bg-[#22c55e]/10 px-3.5 py-2 text-[13px] text-[#22c55e]">
                <span>
                  ✅ {doneTasks} task{doneTasks !== 1 ? "s" : ""} completed — sent
                  to parent
                </span>
              </div>
            )}

            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                viewDate={viewDateRef.current}
                coinPop={coinPops.find((p) => p.taskId === task.id)}
                onComplete={(timeSpentSecs: number | null) =>
                  task.requires_photo
                    ? requestPhotoThenComplete(task, timeSpentSecs)
                    : completeTask(task, timeSpentSecs)
                }
                isToday={isToday}
                sessionState={sessionTimers[task.id]}
                activeSessionTaskId={activeSessionTaskId}
                onStartSession={startSessionTimer}
                onStopSession={stopSessionTimer}
                onDoneSession={doneSessionTimer}
                uploadingPhoto={uploadingPhotoTaskId === task.id}
              />
            ))}
          </>
        )}

        <div className="h-20" />
      </div>

      {/* "+" FAB */}
      {isToday && (
        <button
          onClick={openAddTask}
          className="fixed bottom-6 right-[18px] z-[150] flex h-14 w-14 items-center justify-center rounded-full text-[28px] font-black text-[#1a1a2e]"
          style={{
            background: "linear-gradient(135deg, #f5c518, #f97316)",
            boxShadow: "0 4px 16px rgba(245,197,24,0.4)",
          }}
        >
          +
        </button>
      )}

      {/* Add-task bottom sheet */}
      {addTaskStep && (
        <div
          onClick={closeAddTask}
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/60"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] border border-border border-b-0 bg-surface px-[18px] pb-6 pt-5"
          >
            {addTaskStep === "templates" && (
              <>
                <div className="mb-4 flex items-center">
                  <span className="flex-1 text-[18px] font-extrabold">
                    ✨ Ask for a new task
                  </span>
                  <button
                    onClick={closeAddTask}
                    className="h-8 w-8 rounded-lg bg-surface text-[16px] text-muted"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-3.5 text-[13px] text-muted">
                  Pick something you want to do — your parent checks it before it
                  counts!
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2.5">
                  {KID_TASK_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => pickTemplate(t)}
                      className="flex flex-col items-center gap-1 rounded-[14px] border border-border bg-surface px-2 py-3.5"
                    >
                      <span className="text-[26px]">{t.icon}</span>
                      <span className="text-center text-[12px] font-semibold">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={pickCustomTask}
                  className="w-full rounded-[14px] border border-[#4f8ef7]/30 bg-[#4f8ef7]/10 p-3.5 text-center font-bold text-[#4f8ef7]"
                >
                  💡 Something else
                </button>
              </>
            )}

            {addTaskStep === "form" && addTaskForm && (
              <>
                <div className="mb-4 flex items-center">
                  <button
                    onClick={() => setAddTaskStep("templates")}
                    className="mr-2 h-8 w-8 rounded-lg bg-surface text-[16px] text-muted"
                  >
                    ‹
                  </button>
                  <span className="flex-1 text-[18px] font-extrabold">
                    ✨ New task
                  </span>
                  <button
                    onClick={closeAddTask}
                    className="h-8 w-8 rounded-lg bg-surface text-[16px] text-muted"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-1.5 text-[12px] text-muted">
                  Pick an icon
                </div>
                <div className="mb-3.5 flex flex-wrap gap-1.5">
                  {KID_ICON_CHOICES.map((ic) => (
                    <button
                      key={ic}
                      onClick={() =>
                        setAddTaskForm((f) => (f ? { ...f, icon: ic } : f))
                      }
                      className="h-10 w-10 rounded-[10px] text-[20px]"
                      style={{
                        background:
                          addTaskForm.icon === ic
                            ? "rgba(245,197,24,0.25)"
                            : "var(--surface)",
                        border: `1px solid ${
                          addTaskForm.icon === ic
                            ? "rgba(245,197,24,0.5)"
                            : "var(--border)"
                        }`,
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>

                <div className="mb-1.5 text-[12px] text-muted">
                  What do you want to do?
                </div>
                <input
                  value={addTaskForm.name}
                  onChange={(e) =>
                    setAddTaskForm((f) =>
                      f ? { ...f, name: e.target.value } : f,
                    )
                  }
                  placeholder="Task name"
                  autoFocus
                  className="mb-3.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] text-foreground"
                />

                <div className="mb-1.5 text-[12px] text-muted">When?</div>
                <input
                  type="time"
                  value={addTaskForm.time}
                  onChange={(e) =>
                    setAddTaskForm((f) =>
                      f ? { ...f, time: e.target.value } : f,
                    )
                  }
                  className="mb-3.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] text-foreground"
                />

                <div className="mb-1.5 text-[12px] text-muted">
                  Tell your parent why (optional)
                </div>
                <textarea
                  value={addTaskForm.note}
                  onChange={(e) =>
                    setAddTaskForm((f) =>
                      f ? { ...f, note: e.target.value } : f,
                    )
                  }
                  rows={2}
                  placeholder="I want to help out because…"
                  className="mb-[18px] w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-foreground"
                />

                <button
                  onClick={submitKidTask}
                  disabled={!addTaskForm.name.trim() || submittingTask}
                  className="w-full rounded-[14px] border border-[#22c55e]/40 bg-[#22c55e]/20 p-3.5 text-[15px] font-extrabold text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingTask ? "Sending…" : "🎉 Ask my parent!"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation toast */}
      {taskSentToast && (
        <div className="fixed bottom-24 left-1/2 z-[260] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-[#22c55e]/95 px-[18px] py-2.5 text-[13px] font-bold text-[#052e16] shadow-lg">
          🎉 Sent to your parent!
        </div>
      )}

      {/* Initiative bottom sheet */}
      {initiativeStep && initiativeData && (
        <div
          onClick={closeInitiative}
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/60"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] border border-border border-b-0 bg-surface px-[18px] pb-6 pt-5"
          >
            <div className="mb-4 flex items-center">
              <span className="flex-1 text-[18px] font-extrabold">
                🌟 New Initiative
              </span>
              <button
                onClick={closeInitiative}
                className="h-8 w-8 rounded-lg bg-surface text-[16px] text-muted"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex gap-1.5">
              {(["before", "note", "after"] as const).map((s) => (
                <div
                  key={s}
                  className="h-1 flex-1 rounded-sm"
                  style={{
                    background:
                      s === initiativeStep
                        ? "#a855f7"
                        : ["before", "note", "after"].indexOf(s) <
                          ["before", "note", "after"].indexOf(initiativeStep)
                        ? "rgba(168,85,247,0.4)"
                        : "var(--border)",
                  }}
                />
              ))}
            </div>

            {initiativeStep === "before" && (
              <>
                <div className="mb-3.5 text-[14px] text-foreground">
                  Doing something on your own? Show us what you&apos;re starting
                  with!
                </div>
                {initiativeData.beforePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initiativeData.beforePreview}
                      alt="Before"
                      className="mb-3 max-h-[260px] w-full rounded-[14px] border border-border object-cover"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => captureInitiativePhoto("before")}
                        className="flex-1 rounded-xl border border-border bg-surface p-3 font-semibold text-muted"
                      >
                        ↺ Retake
                      </button>
                      <button
                        onClick={() => setInitiativeStep("note")}
                        className="flex-[2] rounded-xl border border-[#a855f7]/40 bg-[#a855f7]/20 p-3 font-extrabold text-[#a855f7]"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => captureInitiativePhoto("before")}
                    className="w-full rounded-2xl border border-dashed border-[#a855f7]/40 bg-[#a855f7]/10 p-8 text-center text-[15px] font-bold text-[#a855f7]"
                  >
                    📸 Take Before Photo
                  </button>
                )}
              </>
            )}

            {initiativeStep === "note" && (
              <>
                <div className="mb-3.5 text-[14px] text-foreground">
                  What are you doing?
                </div>
                <textarea
                  value={initiativeData.note}
                  onChange={(e) =>
                    setInitiativeData((d) =>
                      d ? { ...d, note: e.target.value } : d,
                    )
                  }
                  rows={3}
                  autoFocus
                  placeholder="Tell your parent what you're up to… (optional)"
                  className="mb-[18px] w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setInitiativeStep("before")}
                    className="flex-1 rounded-xl border border-border bg-surface p-3 font-semibold text-muted"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setInitiativeStep("after")}
                    className="flex-[2] rounded-xl border border-[#a855f7]/40 bg-[#a855f7]/20 p-3 font-extrabold text-[#a855f7]"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}

            {initiativeStep === "after" && (
              <>
                <div className="mb-3.5 text-[14px] text-foreground">
                  Now show us when you&apos;re done! 🎉
                </div>
                {initiativeData.afterPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initiativeData.afterPreview}
                      alt="After"
                      className="mb-3 max-h-[260px] w-full rounded-[14px] border border-border object-cover"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => captureInitiativePhoto("after")}
                        disabled={submittingInitiative}
                        className="flex-1 rounded-xl border border-border bg-surface p-3 font-semibold text-muted"
                      >
                        ↺ Retake
                      </button>
                      <button
                        onClick={submitInitiative}
                        disabled={submittingInitiative}
                        className="flex-[2] rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/20 p-3 font-extrabold text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingInitiative ? "Sending…" : "🎉 Submit for Review"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => captureInitiativePhoto("after")}
                      className="mb-3 w-full rounded-2xl border border-dashed border-[#22c55e]/40 bg-[#22c55e]/10 p-8 text-center text-[15px] font-bold text-[#22c55e]"
                    >
                      📸 Take After Photo
                    </button>
                    <button
                      onClick={() => setInitiativeStep("note")}
                      className="w-full rounded-xl border border-border bg-surface p-3 font-semibold text-muted"
                    >
                      ← Back
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Initiative confirmation toast */}
      {initiativeSentToast && (
        <div className="fixed bottom-24 left-1/2 z-[260] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-[#a855f7]/95 px-[18px] py-2.5 text-[13px] font-bold text-[#1a0a2e] shadow-lg">
          🌟 Sent for review!
        </div>
      )}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  viewDate,
  coinPop,
  onComplete,
  isToday,
  sessionState,
  activeSessionTaskId,
  onStartSession,
  onStopSession,
  onDoneSession,
  uploadingPhoto,
}: {
  task: TaskRow;
  viewDate: string;
  coinPop?: CoinPop;
  onComplete: (timeSpentSecs: number | null) => void;
  isToday: boolean;
  sessionState?: SessionTimerState;
  activeSessionTaskId: string | null;
  onStartSession: (task: TaskRow) => void;
  onStopSession: (task: TaskRow) => void;
  onDoneSession: (task: TaskRow) => void;
  uploadingPhoto: boolean;
}) {
  const status = beehave.getTaskStatus(task, false, viewDate);
  const [countdown, setCountdown] = useState<number | null>(
    beehave.secondsUntilChange(task, status),
  );

  const sessionDuration = getSessionDuration(task);
  const isFocus =
    (task.task_type === "session" || task.task_type === "focus") &&
    sessionDuration > 0;

  const timer: SessionTimerState = sessionState || {
    running: false,
    hasStarted: false,
    remaining: sessionDuration,
    totalElapsed: 0,
  };
  const isLocked = !!activeSessionTaskId && activeSessionTaskId !== task.id;

  useEffect(() => {
    if (status === "missed") return;
    const t = setInterval(
      () =>
        setCountdown(
          beehave.secondsUntilChange(
            task,
            beehave.getTaskStatus(task, false, viewDate),
          ),
        ),
      1000,
    );
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const statusConfig: Record<
    string,
    { bg: string; border: string; label: string; labelColor: string; icon: string }
  > = {
    upcoming: {
      bg: "var(--surface)",
      border: "var(--border)",
      label: "Upcoming",
      labelColor: "#94a3b8",
      icon: "⏰",
    },
    active: {
      bg: "rgba(245,197,24,0.06)",
      border: "rgba(245,197,24,0.25)",
      label: "Do it now!",
      labelColor: "#f5c518",
      icon: "⚡",
    },
    grace: {
      bg: "rgba(249,115,22,0.06)",
      border: "rgba(249,115,22,0.25)",
      label: "Running late",
      labelColor: "#f97316",
      icon: "⚠️",
    },
    missed: {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.2)",
      label: "Missed",
      labelColor: "#ef4444",
      icon: "❌",
    },
  };
  const cfg = statusConfig[status] || statusConfig.upcoming;
  const previewCoins = beehave.calculateCoins(task);
  const isActionable = isToday;

  const timerRatio =
    sessionDuration > 0 ? timer.remaining / sessionDuration : 1;
  const timerColor =
    timerRatio > 0.5 ? "#22c55e" : timerRatio > 0.25 ? "#f97316" : "#ef4444";
  const totalElapsedMins = Math.floor(timer.totalElapsed / 60);

  const badgeCls =
    "inline-flex items-center gap-1 rounded-[20px] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px]";

  return (
    <div
      className="relative mb-2.5 rounded-2xl px-4 py-3.5 transition-all"
      style={{
        background: isFocus ? "rgba(79,142,247,0.04)" : cfg.bg,
        border: `1px solid ${
          isFocus ? "rgba(79,142,247,0.25)" : cfg.border
        }`,
        borderLeft: isFocus
          ? "3px solid rgba(79,142,247,0.6)"
          : `1px solid ${cfg.border}`,
        opacity: status === "upcoming" ? 0.75 : 1,
      }}
    >
      {coinPop && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-[100] text-[18px] font-extrabold"
          style={{
            color: coinPop.pending ? "#a855f7" : "#f5c518",
            animation: "beehaveCoinPop 0.8s ease-out forwards",
          }}
        >
          {coinPop.pending ? "⏳" : "+"}
          {coinPop.amount}🪙
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] text-[24px]"
          style={{
            background:
              status === "missed"
                ? "rgba(239,68,68,0.15)"
                : "var(--surface)",
          }}
        >
          {task.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-[3px] flex flex-wrap items-center gap-[7px]">
            <span className="text-[15px] font-bold">{task.name}</span>
            <span
              className={badgeCls}
              style={{
                background: cfg.bg,
                color: cfg.labelColor,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {cfg.icon} {cfg.label}
            </span>
            {isFocus && (
              <span
                className={badgeCls}
                style={{
                  background: "rgba(79,142,247,0.1)",
                  color: "#4f8ef7",
                  border: "1px solid rgba(79,142,247,0.3)",
                }}
              >
                ⏱ Session
              </span>
            )}
            {task.requires_approval && (
              <span
                className={badgeCls}
                style={{
                  background: "rgba(168,85,247,0.1)",
                  color: "#a855f7",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                👀 Parent checks
              </span>
            )}
            {task.requires_photo && (
              <span
                className={badgeCls}
                style={{
                  background: "rgba(168,85,247,0.1)",
                  color: "#a855f7",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                📷 Photo needed
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[12px] text-muted">
              {beehave.formatTime(task.start_time)} –{" "}
              {beehave.formatTime(task.deadline_time)}
            </span>
            {isToday && status !== "missed" && countdown !== null && (
              <span
                className="text-[12px] font-semibold"
                style={{ color: cfg.labelColor }}
              >
                {status === "upcoming"
                  ? `Starts in ${beehave.formatCountdown(countdown)}`
                  : `${beehave.formatCountdown(countdown)} left`}
              </span>
            )}
          </div>

          <div
            className="mt-1 flex items-center gap-1 text-[13px]"
            style={{
              color: task.requires_approval
                ? "#a855f7"
                : status === "grace"
                ? "#f97316"
                : "#f5c518",
            }}
          >
            <GoldCoin size={12} />
            <span>
              {status === "grace"
                ? `+${Math.max(
                    1,
                    Math.floor(task.full_coins / 2),
                  )} coins — late`
                : `+${previewCoins} coins`}
              {task.requires_approval ? " · needs approval" : ""}
              {isFocus &&
                sessionDuration > 0 &&
                ` · ${formatDuration(sessionDuration)} session`}
            </span>
          </div>

          {isFocus && timer.hasStarted && (
            <div
              className="mt-2 overflow-hidden rounded-[10px]"
              style={{
                background: "var(--surface)",
                border: `1px solid ${timerColor}44`,
              }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div>
                  <span
                    className="block text-[28px] font-extrabold tracking-[-1px] tabular-nums"
                    style={{
                      color: timerColor,
                      ...(timer.running && timer.remaining < 30
                        ? { animation: "beehaveTimerPulse 1s infinite" }
                        : {}),
                    }}
                  >
                    {formatDuration(timer.remaining)}
                  </span>
                  <span className="text-[10px] text-muted">remaining</span>
                </div>
                {timer.totalElapsed > 0 && (
                  <div className="ml-1">
                    <span className="block text-[14px] font-bold text-[#4f8ef7]">
                      {formatDuration(timer.totalElapsed)}
                    </span>
                    <span className="text-[10px] text-muted">
                      studied so far
                    </span>
                  </div>
                )}
                <div className="flex flex-1 justify-end gap-1.5">
                  {timer.running ? (
                    <button
                      onClick={() => onStopSession(task)}
                      className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/15 px-3.5 py-1.5 text-[13px] font-bold text-[#ef4444]"
                    >
                      ⏹ Stop
                    </button>
                  ) : timer.remaining > 0 ? (
                    <button
                      onClick={() => onStartSession(task)}
                      disabled={isLocked}
                      className="rounded-lg border border-[#4f8ef7]/40 bg-[#4f8ef7]/15 px-3.5 py-1.5 text-[13px] font-bold text-[#4f8ef7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isLocked ? "🔒 Locked" : "▶ Resume"}
                    </button>
                  ) : null}
                </div>
              </div>
              {!timer.running && timer.totalElapsed > 0 && (
                <button
                  onClick={() => onDoneSession(task)}
                  disabled={uploadingPhoto}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-[#22c55e]/20 bg-[#22c55e]/15 p-2.5 text-[14px] font-extrabold text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    "📷 Uploading photo…"
                  ) : (
                    <>
                      ✅ Done — I studied{" "}
                      {totalElapsedMins > 0
                        ? `${totalElapsedMins} min`
                        : `${timer.totalElapsed}s`}
                      {timer.totalElapsed >= sessionDuration && (
                        <span className="text-[#f5c518]">🏆</span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {isActionable && status !== "missed" && (
          <div className="shrink-0">
            {isFocus ? (
              !timer.hasStarted ? (
                <button
                  onClick={() => onStartSession(task)}
                  disabled={isLocked}
                  className="rounded-xl border border-[#4f8ef7]/40 bg-[#4f8ef7]/20 px-4 py-3 text-[13px] font-bold text-[#4f8ef7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLocked ? "🔒 Locked" : "▶ Start"}
                </button>
              ) : null
            ) : (
              <button
                onClick={() => onComplete(null)}
                disabled={uploadingPhoto}
                className="rounded-xl px-4 py-3 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  {
                    background:
                      status === "grace"
                        ? "rgba(249,115,22,0.2)"
                        : "rgba(34,197,94,0.15)",
                    border:
                      status === "grace"
                        ? "1px solid rgba(249,115,22,0.4)"
                        : "1px solid rgba(34,197,94,0.35)",
                    color: status === "grace" ? "#f97316" : "#22c55e",
                  } as CSSProperties
                }
              >
                {uploadingPhoto
                  ? "📷 Uploading…"
                  : task.requires_photo
                  ? "📷 Done"
                  : "✓ Done"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kid Rewards tab ─────────────────────────────────────────────────────────
type KidRewardRow = {
  id: string;
  name: string;
  icon: string;
  coin_cost: number;
  description?: string | null;
};

type KidPendingRedemption = {
  id: string;
  coins_spent: number;
  reward?: { name?: string; icon?: string } | null;
};

function KidRewards() {
  const { profile, refreshCurrentProfile } = useBeehaveAuth();
  const supabase = getSupabaseClient();

  const [rewards, setRewards] = useState<KidRewardRow[]>([]);
  const [pending, setPending] = useState<KidPendingRedemption[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const balance = profile?.coin_balance ?? 0;

  const load = async () => {
    if (!supabase || !profile) return;
    const [{ data: rw }, { data: pd }] = await Promise.all([
      supabase.from("rewards").select("*").eq("is_active", true).order("coin_cost"),
      supabase
        .from("reward_redemptions")
        .select("*, reward:reward_id(name, icon)")
        .eq("kid_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setRewards((rw as KidRewardRow[]) || []);
    setPending((pd as KidPendingRedemption[]) || []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function setQ(id: string, n: number) {
    setQty((m) => ({ ...m, [id]: Math.max(1, n) }));
  }

  async function cancelRedemption(p: KidPendingRedemption) {
    if (!supabase || !profile) return;
    setCancelBusy(p.id);
    try {
      await supabase.from("reward_redemptions").delete().eq("id", p.id);
      const { data: k } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", profile.id)
        .single();
      const before = (k as { coin_balance?: number } | null)?.coin_balance ?? 0;
      await supabase
        .from("profiles")
        .update({ coin_balance: before + p.coins_spent })
        .eq("id", profile.id);
      await supabase.from("coin_transactions").insert({
        kid_id: profile.id,
        amount: p.coins_spent,
        reason: `Cancelled: ${p.reward?.name ?? "reward"}`,
        transaction_type: "refund",
      });
      playSound("coin");
      await refreshCurrentProfile();
      await load();
    } finally {
      setCancelBusy(null);
    }
  }

  async function redeem(r: KidRewardRow) {
    if (!supabase || !profile) return;
    const n = qty[r.id] || 1;
    const cost = n * r.coin_cost;
    if (n < 1 || cost > balance) return;
    setBusy(r.id);
    try {
      await supabase.from("reward_redemptions").insert({
        kid_id: profile.id,
        reward_id: r.id,
        coins_spent: cost,
        status: "pending",
      });
      await supabase.from("coin_transactions").insert({
        kid_id: profile.id,
        amount: -cost,
        reason: `Redeemed: ${r.name}${n > 1 ? ` x${n}` : ""}`,
        transaction_type: "redemption",
      });
      await supabase
        .from("profiles")
        .update({ coin_balance: Math.max(0, balance - cost) })
        .eq("id", profile.id);
      playSound("coin");
      await refreshCurrentProfile();
      await load();
      setQ(r.id, 1);
      setToast(`Sent to your parent — ${r.icon} ${r.name}${n > 1 ? ` x${n}` : ""}`);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-3.5 pb-24 pt-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">Rewards</h2>
        <span className="flex items-center gap-1 text-[14px] font-bold text-[#f5c518]">
          <GoldCoin size={14} /> {balance}
        </span>
      </div>

      {pending.length > 0 && (
        <div className="mb-4 flex flex-col gap-1.5">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-2 text-[12px]"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-[#a855f7]">
                ⏳ {p.reward?.icon} {p.reward?.name} — waiting for parent
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[#f5c518]">
                <GoldCoin size={10} /> {p.coins_spent}
              </span>
              <button
                onClick={() => cancelRedemption(p)}
                disabled={cancelBusy === p.id}
                className="shrink-0 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-1 text-[11px] font-bold text-[#ef4444] disabled:opacity-40"
              >
                {cancelBusy === p.id ? "…" : "✕ Cancel"}
              </button>
            </div>
          ))}
        </div>
      )}

      {rewards.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No rewards yet.</p>
      ) : (
        rewards.map((r) => {
          const n = qty[r.id] || 1;
          const canAfford = balance >= r.coin_cost;
          const totalCost = n * r.coin_cost;
          const overBudget = totalCost > balance;
          return (
            <div
              key={r.id}
              className={`mb-2 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 ${
                canAfford ? "" : "opacity-50"
              }`}
            >
              <span className="text-[28px]">{r.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{r.name}</div>
                {r.description && (
                  <div className="text-[13px] text-muted">{r.description}</div>
                )}
                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#f5c518]">
                  <GoldCoin size={11} /> {r.coin_cost} each
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setQ(r.id, n - 1)}
                  disabled={!canAfford || n <= 1}
                  className="h-7 w-7 rounded-lg border border-border bg-background text-[16px] font-bold disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-5 text-center text-[14px] font-bold tabular-nums">
                  {n}
                </span>
                <button
                  onClick={() => setQ(r.id, n + 1)}
                  disabled={!canAfford || (n + 1) * r.coin_cost > balance}
                  className="h-7 w-7 rounded-lg border border-border bg-background text-[16px] font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => redeem(r)}
                disabled={!canAfford || overBudget || busy === r.id}
                className="shrink-0 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/15 px-3.5 py-2 text-[13px] font-bold text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === r.id
                  ? "…"
                  : !canAfford
                  ? "Not enough 🪙"
                  : `Redeem ${totalCost}`}
              </button>
            </div>
          );
        })
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#22c55e]/95 px-4 py-2 text-[13px] font-bold text-[#052e16] shadow-lg">
          🎁 {toast}
        </div>
      )}
    </div>
  );
}

// ─── Kid Passbook (coin statement) ───────────────────────────────────────────
type CoinTxn = {
  id: string;
  amount: number;
  reason: string;
  transaction_type: string;
  created_at: string;
};

const TXN_META: Record<string, { icon: string; label: string }> = {
  task_reward: { icon: "✅", label: "Task" },
  bonus: { icon: "⭐", label: "Award" },
  penalty: { icon: "⚠️", label: "Deduction" },
  redemption: { icon: "🎁", label: "Reward" },
  adjustment: { icon: "↩️", label: "Refund" },
  refund: { icon: "↩️", label: "Refund" },
};

function passbookDayLabel(d: Date): string {
  const today = new Date();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const s = localDateStr(d);
  if (s === localDateStr(today)) return "Today";
  if (s === localDateStr(yest)) return "Yesterday";
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function KidPassbook() {
  const { profile, refreshCurrentProfile } = useBeehaveAuth();
  const supabase = getSupabaseClient();
  const [txns, setTxns] = useState<CoinTxn[]>([]);
  const [loaded, setLoaded] = useState(false);

  const balance = profile?.coin_balance ?? 0;

  useEffect(() => {
    if (!supabase || !profile) return;
    const kidId = profile.id;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("coin_transactions")
        .select("id, amount, reason, transaction_type, created_at")
        .eq("kid_id", kidId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setTxns((data as CoinTxn[]) || []);
        setLoaded(true);
      }
    };
    void load();
    const ch = supabase
      .channel(`beehave-passbook-${kidId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coin_transactions",
          filter: `kid_id=eq.${kidId}`,
        },
        () => {
          void load();
          void refreshCurrentProfile();
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Running balance, newest first — best effort (the real balance is clamped
  // at 0 in a few places, so very old rows can be approximate).
  let after = balance;
  const rows = txns.map((t) => {
    const row = { ...t, after };
    after = Math.max(0, after - t.amount);
    return row;
  });

  const groups: {
    day: string;
    net: number;
    items: (CoinTxn & { after: number })[];
  }[] = [];
  for (const r of rows) {
    const day = passbookDayLabel(new Date(r.created_at));
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) {
      g = { day, net: 0, items: [] };
      groups.push(g);
    }
    g.items.push(r);
    g.net += r.amount;
  }

  return (
    <div className="flex-1 overflow-y-auto px-3.5 pb-24 pt-3.5">
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Balance
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[28px] font-black text-[#f5c518]">
          <GoldCoin size={22} /> {balance}
        </div>
      </div>

      {!loaded ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No activity yet.</p>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="mb-4">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {g.day}
              </span>
              <span
                className={`text-[12px] font-bold ${
                  g.net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                }`}
              >
                {g.net >= 0 ? "+" : ""}
                {g.net} 🪙
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {g.items.map((t, i) => {
                const meta = TXN_META[t.transaction_type] ?? {
                  icon: "•",
                  label: "Activity",
                };
                const pos = t.amount >= 0;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span className="text-[18px]">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">
                        {t.reason || meta.label}
                      </div>
                      <div className="text-[11px] text-muted">
                        {meta.label} ·{" "}
                        {new Date(t.created_at).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`text-[14px] font-bold tabular-nums ${
                          pos ? "text-[#22c55e]" : "text-[#ef4444]"
                        }`}
                      >
                        {pos ? "+" : ""}
                        {t.amount}
                      </div>
                      <div className="text-[11px] tabular-nums text-muted">
                        bal {t.after}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
