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
    available: false,
  },
  {
    slug: "naplan",
    name: "NAPLAN",
    description: "NAPLAN-style practice tests.",
    available: false,
  },
  {
    slug: "selective-test",
    name: "Selective Test",
    description: "Selective school entry test practice.",
    available: false,
  },
  {
    slug: "edutest",
    name: "EduTest",
    description: "EduTest-style practice papers.",
    available: false,
  },
];

export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}
