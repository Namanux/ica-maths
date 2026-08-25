export const XP_LEVELS = [
  { minXp: 0, title: "Beginner" },
  { minXp: 100, title: "Learner" },
  { minXp: 300, title: "Calculator Crusher" },
  { minXp: 600, title: "Mental Math Master" },
  { minXp: 1000, title: "Abacus Champion" },
];

export function getLevelTitle(xp: number): string {
  let title = XP_LEVELS[0].title;
  for (const level of XP_LEVELS) {
    if (xp >= level.minXp) title = level.title;
  }
  return title;
}

export function getXpToNextLevel(xp: number): number {
  const next = XP_LEVELS.find((level) => level.minXp > xp);
  return next ? next.minXp - xp : 0;
}

export function addXp(current: number, earned: number): number {
  return current + earned;
}
