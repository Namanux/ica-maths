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

type Pair = { a: number; b: number };

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Groups addition pairs by their sum, so a session never shows the same
// total twice while still varying which pair of numbers produces it.
function groupBySum(pairs: Pair[]): Map<number, Pair[]> {
  const map = new Map<number, Pair[]>();
  for (const pair of pairs) {
    const sum = pair.a + pair.b;
    const list = map.get(sum);
    if (list) list.push(pair);
    else map.set(sum, [pair]);
  }
  return map;
}

// a + b, both 1-4, staying at or below 4 — no complement technique needed,
// just pushing beads straight down.
function directAdditionPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let a = 1; a <= 4; a++) {
    for (let b = 1; b <= 4; b++) {
      if (a + b <= 4) pairs.push({ a, b });
    }
  }
  return pairs;
}

// Sums that land on 5-9 without carrying into the tens — the "small
// friends" (5's complement) range.
function smallFriendsPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 4; b++) {
      const sum = a + b;
      if (sum >= 5 && sum <= 9) pairs.push({ a, b });
    }
  }
  return pairs;
}

// Sums that carry into the tens — the "big friends" (10's complement) range.
function bigFriendsPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const sum = a + b;
      if (sum >= 10 && sum <= 18) pairs.push({ a, b });
    }
  }
  return pairs;
}

function multiDigitPairs(): Pair[] {
  return Array.from({ length: 60 }, () => ({ a: randomInt(10, 99), b: randomInt(10, 99) }));
}

// Picks `count` questions from a pool of addition pairs, grouped by sum so
// answers don't repeat within a session where the pool allows it — reusing
// the same cycling strategy as pickAnswers, but tracking which pair
// produced each sum so the display varies even when a sum repeats.
function pickAdditionQuestions(pairs: Pair[], count: number, prompt: string): Question[] {
  const bySum = groupBySum(pairs);
  const sums = pickAnswers(Array.from(bySum.keys()), count);
  return sums.map((sum, i) => {
    const candidates = bySum.get(sum) ?? [];
    const pair = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      id: i + 1,
      prompt,
      display: `${pair.a} + ${pair.b}`,
      answer: sum,
    };
  });
}

function buildLevel2Questions(lesson: number, count: number): Question[] {
  const prompt = "What is the total?";
  switch (lesson) {
    case 1:
      return pickAdditionQuestions(directAdditionPairs(), count, prompt);
    case 2:
      return pickAdditionQuestions(smallFriendsPairs(), count, prompt);
    case 3:
      return pickAdditionQuestions(bigFriendsPairs(), count, prompt);
    case 4:
      return pickAdditionQuestions(
        [...directAdditionPairs(), ...smallFriendsPairs(), ...bigFriendsPairs()],
        count,
        prompt
      );
    case 5:
      return pickAdditionQuestions(multiDigitPairs(), count, prompt);
    default:
      return [];
  }
}

// Levels 3-5 are locked in the UI — these placeholders exist only so the
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
  let questions: Question[];
  if (level === 1) questions = buildLevel1Questions(lesson, count);
  else if (level === 2) questions = buildLevel2Questions(lesson, count);
  else questions = buildPlaceholderQuestions(count);
  return shuffle(questions);
}
