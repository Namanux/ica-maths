"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Finger-coloured QWERTY that flashes a key when the matching physical key is
 * pressed in the writing area. Collapsible. Ported from the prototype's
 * floating keyboard bar; colours re-mapped to a compact fixed palette that
 * reads in both light and dark themes.
 */

type Finger = "pinky" | "ring" | "middle" | "index";

const FINGER_CLASS: Record<Finger, string> = {
  pinky: "bg-rose-500/85 text-white",
  ring: "bg-sky-500/85 text-white",
  middle: "bg-amber-400/90 text-neutral-900",
  index: "bg-emerald-500/85 text-white",
};

interface Key {
  label: string;
  finger: Finger;
  width?: "wide" | "caps" | "xwide";
  homeDot?: boolean;
}

const LAYOUT: Key[][] = [
  [
    { label: "`", finger: "pinky" },
    { label: "1", finger: "pinky" },
    { label: "2", finger: "ring" },
    { label: "3", finger: "middle" },
    { label: "4", finger: "index" },
    { label: "5", finger: "index" },
    { label: "6", finger: "index" },
    { label: "7", finger: "index" },
    { label: "8", finger: "middle" },
    { label: "9", finger: "ring" },
    { label: "0", finger: "pinky" },
    { label: "-", finger: "pinky" },
    { label: "=", finger: "pinky" },
    { label: "Backspace", finger: "pinky", width: "xwide" },
  ],
  [
    { label: "Tab", finger: "pinky", width: "wide" },
    { label: "q", finger: "pinky" },
    { label: "w", finger: "ring" },
    { label: "e", finger: "middle" },
    { label: "r", finger: "index" },
    { label: "t", finger: "index" },
    { label: "y", finger: "index" },
    { label: "u", finger: "index" },
    { label: "i", finger: "middle" },
    { label: "o", finger: "ring" },
    { label: "p", finger: "pinky" },
    { label: "[", finger: "pinky" },
    { label: "]", finger: "pinky" },
    { label: "\\", finger: "pinky" },
  ],
  [
    { label: "CapsLock", finger: "pinky", width: "caps" },
    { label: "a", finger: "pinky" },
    { label: "s", finger: "ring" },
    { label: "d", finger: "middle" },
    { label: "f", finger: "index", homeDot: true },
    { label: "g", finger: "index" },
    { label: "h", finger: "index" },
    { label: "j", finger: "index", homeDot: true },
    { label: "k", finger: "middle" },
    { label: "l", finger: "ring" },
    { label: ";", finger: "pinky" },
    { label: "'", finger: "pinky" },
    { label: "Enter", finger: "pinky", width: "xwide" },
  ],
  [
    { label: "Shift", finger: "pinky", width: "xwide" },
    { label: "z", finger: "pinky" },
    { label: "x", finger: "ring" },
    { label: "c", finger: "middle" },
    { label: "v", finger: "index" },
    { label: "b", finger: "index" },
    { label: "n", finger: "index" },
    { label: "m", finger: "index" },
    { label: ",", finger: "middle" },
    { label: ".", finger: "ring" },
    { label: "/", finger: "pinky" },
    { label: "Shift", finger: "pinky", width: "xwide" },
  ],
];

const WIDTH_CLASS: Record<NonNullable<Key["width"]>, string> = {
  wide: "grow-[1.7] text-[11px]",
  caps: "grow-[2] text-[11px]",
  xwide: "grow-[2.3] text-[11px]",
};

const LEGEND: { finger: Finger; label: string }[] = [
  { finger: "pinky", label: "Pinky" },
  { finger: "ring", label: "Ring" },
  { finger: "middle", label: "Middle" },
  { finger: "index", label: "Index" },
];

export function OnScreenKeyboard({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      setActive(k);
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => setActive(null), 130);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [targetRef]);

  return (
    <div className="rounded-lg border border-border bg-surface/60 no-print">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Typing guide
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted hover:text-foreground"
        >
          {collapsed ? "Show keyboard" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {LAYOUT.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((key, ki) => {
                const isActive =
                  active != null &&
                  (active === key.label.toLowerCase() ||
                    (active === " " && key.label === "Space"));
                return (
                  <div
                    key={`${ri}-${ki}`}
                    className={`relative flex h-8 grow basis-0 items-center justify-center rounded-md border-b-2 border-black/20 text-[13px] font-bold transition-transform ${
                      FINGER_CLASS[key.finger]
                    } ${key.width ? WIDTH_CLASS[key.width] : ""} ${
                      isActive ? "translate-y-0.5 brightness-90" : ""
                    }`}
                  >
                    {key.label}
                    {key.homeDot && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {LEGEND.map((l) => (
              <span key={l.finger} className="flex items-center gap-1 text-[11px] text-muted">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${FINGER_CLASS[l.finger].split(" ")[0]}`}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
