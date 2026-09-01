export type Subject = {
  slug: string;
  name: string;
  description: string;
  available: boolean;
};

export const SUBJECTS: Subject[] = [
  {
    slug: "icas",
    name: "ICAS",
    description: "Full-length ICAS-style Mathematics practice papers, timed like the real exam.",
    available: true,
  },
  {
    slug: "abacus",
    name: "Abacus",
    description: "Mental arithmetic and abacus practice.",
    available: true,
  },
  {
    slug: "naplan",
    name: "NAPLAN",
    description:
      "NAPLAN-style Numeracy practice papers, timed like the real test.",
    available: true,
  },
  {
    slug: "selective-test",
    name: "Selective Test",
    description: "NSW Selective High School Placement — Mathematical Reasoning practice.",
    available: true,
  },
  {
    slug: "edutest",
    name: "EduTest",
    description:
      "EduTest-style scholarship & selective-entry practice — Mathematics and Numerical Reasoning, timed like the real test.",
    available: true,
  },
  {
    slug: "writing",
    name: "Writing practice",
    description:
      "ICAS-style timed writing — a narrative or persuasive task, an on-screen typing guide, and AI feedback against the real 3-domain framework.",
    available: true,
  },
];

export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}
