"use client";

export function SessionResults({
  questionsTotal,
  questionsCorrect,
  accuracy,
  xpEarned,
  totalXp,
  levelTitle,
  onPlayAgain,
  onBack,
}: {
  questionsTotal: number;
  questionsCorrect: number;
  accuracy: number;
  xpEarned: number;
  totalXp: number;
  levelTitle: string;
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Session complete</h1>
        <p className="text-muted mt-1">
          {questionsCorrect} out of {questionsTotal} correct
        </p>
      </div>

      <div className="text-5xl font-bold">{Math.round(accuracy)}%</div>

      <div className="rounded-lg border border-border p-5 w-full flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-muted">XP earned</span>
          <span className="font-medium">+{xpEarned}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Total XP</span>
          <span className="font-medium">{totalXp}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Level</span>
          <span className="font-medium">{levelTitle}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-surface transition-colors"
        >
          Back to Curriculum
        </button>
      </div>
    </div>
  );
}
