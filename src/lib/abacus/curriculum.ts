export type Lesson = {
  id: number;
  title: string;
  description: string;
};

export type CurriculumLevel = {
  level: number;
  title: string;
  description: string;
  lessons: Lesson[];
};

// Levels map onto the progression engine's content blocks (see
// progressionEngine.ts): 1-4 = Level 1, 5-9 = Level 2. A level unlocks once
// the student's actual content block has reached its first lesson — this is
// what the practice session really plays, regardless of which level card
// was clicked. Levels 3-5 have no real content yet, so they stay locked
// regardless of content block.
export function isLevelUnlocked(level: number, contentBlock: number): boolean {
  if (level === 1) return true;
  if (level === 2) return contentBlock >= 5;
  return false;
}

export const CURRICULUM: CurriculumLevel[] = [
  {
    level: 1,
    title: "Abacus Basics",
    description: "Learn numbers on the abacus",
    lessons: [
      { id: 1, title: "Numbers 1–4", description: "Recognise and set numbers 1 to 4" },
      { id: 2, title: "Numbers 5–9", description: "Recognise and set numbers 5 to 9" },
      { id: 3, title: "Numbers to 99", description: "Two-digit numbers and place value" },
      { id: 4, title: "Place Value", description: "Tens and ones" },
    ],
  },
  {
    level: 2,
    title: "Addition",
    description: "Direct and Friends addition",
    lessons: [
      { id: 1, title: "Direct Addition", description: "Simple bead addition" },
      { id: 2, title: "Small Friends", description: "+5 combinations" },
      { id: 3, title: "Big Friends", description: "+10 combinations" },
      { id: 4, title: "Mixed Addition", description: "Combining all methods" },
      { id: 5, title: "Multi-digit Addition", description: "Larger numbers" },
    ],
  },
  {
    level: 3,
    title: "Subtraction",
    description: "Direct and Friends subtraction",
    lessons: [
      { id: 1, title: "Direct Subtraction", description: "Simple bead subtraction" },
      { id: 2, title: "Small Friends", description: "-5 combinations" },
      { id: 3, title: "Big Friends", description: "-10 combinations" },
      { id: 4, title: "Mixed Subtraction", description: "Combining all methods" },
    ],
  },
  {
    level: 4,
    title: "Advanced Operations",
    description: "Multiplication and division",
    lessons: [
      { id: 1, title: "Mixed Operations", description: "Addition and subtraction combined" },
      { id: 2, title: "Multiplication", description: "Times tables on the abacus" },
      { id: 3, title: "Division", description: "Sharing and grouping" },
    ],
  },
  {
    level: 5,
    title: "Mental Abacus (Anzan)",
    description: "Visualise the abacus in your mind",
    lessons: [
      { id: 1, title: "Guided Anzan", description: "Supported mental calculation" },
      { id: 2, title: "Semi-Anzan", description: "Partial mental calculation" },
      { id: 3, title: "Full Anzan", description: "Fully mental calculation" },
      { id: 4, title: "Speed Anzan", description: "Race against the clock" },
    ],
  },
];
