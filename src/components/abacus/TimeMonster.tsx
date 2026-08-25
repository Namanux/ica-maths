"use client";

// Classic Creeper pixel face, on an 8x8 grid (row, col).
const FACE_PIXELS: [row: number, col: number][] = [
  [1, 1],
  [1, 2],
  [1, 5],
  [1, 6],
  [2, 1],
  [2, 2],
  [2, 5],
  [2, 6],
  [3, 3],
  [3, 4],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [4, 5],
  [4, 6],
  [5, 1],
  [5, 2],
  [5, 5],
  [5, 6],
  [6, 1],
  [6, 2],
  [6, 5],
  [6, 6],
];

const FACE_ORIGIN_X = 12;
const FACE_ORIGIN_Y = 6;
const CELL = 5;

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
  const isExploding = !isRetreating && timeRemaining <= 0;

  const glow = urgent
    ? "drop-shadow(0 0 14px rgba(239,68,68,0.85))"
    : warning
    ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))"
    : "none";

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="absolute top-1/2 transition-all duration-500 ease-out"
        style={{
          left: `${leftPercent}%`,
          transform: `translate(-50%, -50%) scale(${isExploding ? scale * 1.4 : 1})`,
          opacity: isExploding ? 1 : 0,
        }}
      >
        <div
          className="h-20 w-20 rounded-full"
          style={{
            background:
              "radial-gradient(circle, #fff6cc 0%, #fbbf24 35%, #ef4444 65%, transparent 80%)",
          }}
        />
      </div>

      <div
        className={`absolute top-1/2 transition-all duration-500 ease-in-out ${
          urgent ? "animate-pulse" : ""
        }`}
        style={{
          left: `${leftPercent}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          filter: glow,
          opacity: isExploding ? 0 : 1,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          {/* legs */}
          <rect x="16" y="56" width="10" height="8" fill="#2f6b18" />
          <rect x="38" y="56" width="10" height="8" fill="#2f6b18" />
          {/* body */}
          <rect x="10" y="44" width="44" height="16" rx="2" fill="#3d8322" />
          {/* head */}
          <rect x="8" y="4" width="48" height="42" rx="3" fill="#4ea72e" />
          <rect x="8" y="30" width="48" height="16" fill="#43952a" />
          {/* face */}
          {FACE_PIXELS.map(([row, col]) => (
            <rect
              key={`${row}-${col}`}
              x={FACE_ORIGIN_X + col * CELL}
              y={FACE_ORIGIN_Y + row * CELL}
              width={CELL}
              height={CELL}
              fill="#111111"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
