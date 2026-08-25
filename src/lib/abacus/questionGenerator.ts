export type Question = {
  id: number;
  prompt: string; // e.g. "What number is this?"
  display: string; // e.g. "7"  (shown large on screen)
  answer: number;
  hint?: string;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Picks `count` answers from `pool` with no repeats where possible. If count
// exceeds the pool size (e.g. lesson 1 only has 4 distinct numbers to show),
// the pool is reshuffled and reused in full cycles, swapping the seam between
// cycles so the same value never lands twice in a row.
function pickAnswers(pool: number[], count: number): number[] {
  if (count <= pool.length) {
    return shuffle(pool).slice(0, count);
  }
  const picks: number[] = [];
  while (picks.length < count) {
    const cycle = shuffle(pool);
    if (picks.length > 0 && cycle[0] === picks[picks.length - 1]) {
      [cycle[0], cycle[cycle.length - 1]] = [cycle[cycle.length - 1], cycle[0]];
    }
    picks.push(...cycle);
  }
  return picks.slice(0, count);
}

function buildLevel1Questions(lesson: number, count: number): Question[] {
  switch (lesson) {
    case 1: {
      const pool = [1, 2, 3, 4];
      return pickAnswers(pool, count).map((n, i) => ({
        id: i + 1,
        prompt: "What number is this?",
        display: String(n),
        answer: n,
      }));
    }
    case 2: {
      const pool = [5, 6, 7, 8, 9];
      return pickAnswers(pool, count).map((n, i) => ({
        id: i + 1,
        prompt: "What number is this?",
        display: String(n),
        answer: n,
      }));
    }
    case 3: {
      const pool = Array.from({ length: 90 }, (_, i) => i + 10); // 10-99
      return pickAnswers(pool, count).map((n, i) => ({
        id: i + 1,
        prompt: "What number is this?",
        display: String(n),
        answer: n,
      }));
    }
    case 4: {
      const pool = Array.from({ length: 90 }, (_, i) => i + 10); // 10-99
      return pickAnswers(pool, count).map((n, i) => {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return {
          id: i + 1,
          prompt: "What number is this in total?",
          display: `${tens} tens and ${ones} ones`,
          answer: n,
        };
      });
    }
    default:
      return [];
  }
}

// Levels 2-5 are locked in the UI — these placeholders exist only so the
// generator stays total and typed without `any`.
function buildPlaceholderQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    prompt: "Coming soon",
    display: "—",
    answer: 0,
  }));
}

export function generateQuestions(level: number, lesson: number, count: number): Question[] {
  const questions =
    level === 1 ? buildLevel1Questions(lesson, count) : buildPlaceholderQuestions(count);
  return shuffle(questions);
}
