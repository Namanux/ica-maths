"use client";

export function TimeMonster({
  timeLimit,
  timeRemaining,
  isRetreating,
}: {
  timeLimit: number;
  timeRemaining: number;
  isRetreating: boolean;
}) {
  const progress = timeLimit > 0 ? 1 - Math.min(timeRemaining, timeLimit) / timeLimit : 0;
  const leftPercent = isRetreating ? 88 : 88 - progress * 78;
  const scale = isRetreating ? 0.85 : 0.85 + progress * 0.55;

  const urgent = !isRetreating && timeRemaining <= 5;
  const warning = !isRetreating && !urgent && timeRemaining <= 10;
  const bodyColor = urgent ? "#ef4444" : warning ? "#f59e0b" : "var(--muted)";

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className={`absolute top-1/2 transition-all duration-700 ease-in-out ${
          urgent ? "animate-pulse" : ""
        }`}
        style={{
          left: `${leftPercent}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <svg width="64" height="56" viewBox="0 0 64 56" aria-hidden>
          <ellipse cx="20" cy="50" rx="7" ry="4" fill={bodyColor} opacity="0.6" />
          <ellipse cx="44" cy="50" rx="7" ry="4" fill={bodyColor} opacity="0.6" />
          <circle cx="32" cy="30" r="26" fill={bodyColor} />
          <circle cx="23" cy="24" r="6" fill="var(--background)" />
          <circle cx="41" cy="24" r="6" fill="var(--background)" />
          <circle cx="23" cy="25" r="2.5" fill="var(--foreground)" />
          <circle cx="41" cy="25" r="2.5" fill="var(--foreground)" />
        </svg>
      </div>
    </div>
  );
}
